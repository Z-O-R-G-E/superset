import logging
from datetime import timezone, time, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import partial
from typing import Any, Optional, TypedDict, List, Dict, Type, Union
from abc import ABC, abstractmethod
import sqlalchemy as sa
import pandas as pd
import json
from dateutil.parser import isoparse
from flask_babel import lazy_gettext as _
from superset import db
from superset.commands.base import BaseCommand
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseSchemaUploadNotAllowed,
    DatabaseUploadFailed,
    DatabaseUploadSaveMetadataFailed,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.sql_parse import Table
from superset.utils.core import get_user
from superset.utils.decorators import on_error, transaction
from superset.views.database.validators import schema_allows_file_upload

logger = logging.getLogger(__name__)

READ_CHUNK_SIZE = 1000


# region Типы данных
class FieldsMetadataItem(TypedDict):
    column_names: List[str]
    num_rows: Optional[int]
    num_columns: Optional[int]


class FieldsMetadata(TypedDict, total=False):
    items: List[FieldsMetadataItem]


class FieldsReaderOptions(TypedDict, total=False):
    index_column: str
    day_first: bool
    null_values: List[str]
    already_exists: str
    index_label: str
    dataframe_index: bool


# endregion

# region Абстракции
class IFieldHandler(ABC):
    """Абстрактный базовый класс для обработчиков полей"""

    @abstractmethod
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        """Обработать значение поля"""
        pass

    @abstractmethod
    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        """Получить соответствующий тип SQLAlchemy"""
        pass


class IDataFrameConverter(ABC):
    """Абстракция для конвертации полей в DataFrame"""

    @abstractmethod
    def convert_to_dataframe(self, fields: List[Dict[str, Any]],
                             options: Dict[str, Any]) -> pd.DataFrame:
        pass


class IDatabaseLoader(ABC):
    """Абстракция для загрузки данных в БД"""

    @abstractmethod
    def load_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> None:
        pass


# endregion

# region Реализации
class TypeHandlerRegistry:
    """Реестр обработчиков типов данных"""

    def __init__(self):
        self._handlers: Dict[str, Type[IFieldHandler]] = {}

    def register(self, type_name: Union[str, List[str]]):
        """Декоратор для регистрации обработчиков"""

        def decorator(handler_class: Type[IFieldHandler]):
            if isinstance(type_name, list):
                for t in type_name:
                    self._handlers[t.upper()] = handler_class
            else:
                self._handlers[type_name.upper()] = handler_class
            return handler_class

        return decorator

    def get_handler(self, type_name: str) -> Optional[Type[IFieldHandler]]:
        """Получить обработчик для типа"""
        return self._handlers.get(type_name.upper())

    def get_handler_instance(self, type_name: str) -> Optional[IFieldHandler]:
        """Получить экземпляр обработчика для типа"""
        handler_class = self.get_handler(type_name)
        return handler_class() if handler_class else None

type_handler_registry = TypeHandlerRegistry()

# Базовый обработчик для общих методов
class BaseFieldHandler(IFieldHandler):
    def __init__(self):
        self.null_values = set()

    def set_null_values(self, null_values: List[str]):
        self.null_values = set(null_values)

    def is_null(self, value: Any) -> bool:
        """Проверить, является ли значение null"""
        return value is None or value in self.null_values or (
                isinstance(value, str) and value.upper() == "NULL")


@type_handler_registry.register(
    ["TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT", "UINT8"])
class IntegerHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str) and '.' in value:
                value = value.split('.')[0]
            return int(float(value)) if isinstance(value, str) else int(value)
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()


@type_handler_registry.register(
    ["FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL", "BINARY_FLOAT", "BINARY_DOUBLE"])
class FloatHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        precision = field.get("precision", 24)
        return sa.Float(precision=precision)


@type_handler_registry.register(["DECIMAL", "NUMERIC", "NUMBER"])
class DecimalHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        precision = field.get("precision", 18)
        scale = field.get("scale", 4)

        try:
            str_value = str(value).strip().replace(" ", "").replace(",", "")
            decimal_value = Decimal(str_value)

            if precision > 0:
                digits = [d for d in str(decimal_value) if d.isdigit()]
                if len(digits) > precision:
                    raise ValueError(
                        f"Число {decimal_value} превышает максимальную точность {precision}"
                    )

            if scale >= 0:
                return decimal_value.quantize(
                    Decimal('0.' + '0' * scale),
                    rounding=ROUND_HALF_UP
                )
            return decimal_value
        except (ValueError, InvalidOperation, TypeError) as e:
            logger.warning(f"Ошибка преобразования Decimal: {str(e)}")
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)
        return sa.Numeric(precision=precision, scale=scale)


@type_handler_registry.register(
    ["CHAR", "VARCHAR", "TEXT", "NCHAR", "NVARCHAR", "CLOB", "LONGTEXT", "FIXEDSTRING",
     "STRING"])
class StringHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        size = field.get("size")
        value_str = str(value)

        if size is not None and isinstance(size, int):
            return value_str[:size]
        return value_str

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        field_type = field.get("type", "").upper()
        size = field.get("size")

        if field_type == "CHAR":
            return sa.CHAR(
                size if size else 1)
        elif size:
            return sa.VARCHAR(size)
        return sa.Text()


@type_handler_registry.register(["DATE"])
class DateHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            day_first = options.get("day_first", False)
            if day_first:
                return pd.to_datetime(value, dayfirst=True).date()
            return pd.to_datetime(value, format='%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()


@type_handler_registry.register(["TIME"])
class TimeHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        if isinstance(value, time):
            return value

        try:
            if isinstance(value, str):
                try:
                    return datetime.strptime(value, '%H:%M:%S.%f').time()
                except ValueError:
                    try:
                        return datetime.strptime(value, '%H:%M:%S').time()
                    except ValueError:
                        try:
                            return datetime.strptime(value, '%H:%M').time()
                        except ValueError:
                            pass

            dt = pd.to_datetime(value, errors='coerce')
            if not pd.isna(dt):
                return dt.to_pydatetime().time()

            return None
        except (ValueError, TypeError, AttributeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()


@type_handler_registry.register(["DATETIME", "TIMESTAMP", "DATETIME64"])
class DateTimeHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            result = pd.to_datetime(
                value,
                dayfirst=options.get("day_first", False),
                yearfirst=options.get("year_first", False),
                format=options.get("datetime_format"),
                errors="coerce"
            )

            if pd.isna(result):
                logger.warning(f"Не удалось распарсить DATETIME: {value}")
                return None

            return result
        except (ValueError, TypeError) as e:
            logger.warning(f"Не удалось распарсить DATETIME: {value}. Ошибка: {str(e)}")
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()


@type_handler_registry.register(["TIMESTAMPTZ"])
class DateTimeTzHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            # Если значение уже является datetime объектом
            if isinstance(value, datetime):
                if value.tzinfo is not None:
                    return value.astimezone(timezone.utc)
                return value.replace(tzinfo=timezone.utc)

            # Если это строка
            if isinstance(value, str):
                # Пробуем разные форматы парсинга
                try:
                    dt = isoparse(value)
                except ValueError:
                    # Пробуем другие распространенные форматы
                    try:
                        dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S%z')
                    except ValueError:
                        try:
                            dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S.%f%z')
                        except ValueError:
                            try:
                                dt = datetime.strptime(value, '%Y-%m-%dT%H:%M:%S%z')
                            except ValueError:
                                try:
                                    dt = datetime.strptime(value,
                                                           '%Y-%m-%dT%H:%M:%S.%f%z')
                                except ValueError:
                                    # Последняя попытка - парсинг без временной зоны
                                    dt = pd.to_datetime(value, errors='raise')
                                    if dt.tzinfo is None:
                                        dt = dt.replace(tzinfo=timezone.utc)

                # Приводим к UTC если есть временная зона
                if dt.tzinfo is not None:
                    return dt.astimezone(timezone.utc)
                return dt.replace(tzinfo=timezone.utc)

            # Для других типов (например, timestamp) используем pandas
            dt = pd.to_datetime(value, errors='coerce')
            if pd.isna(dt):
                return None
            if isinstance(dt, pd.Timestamp):
                dt = dt.to_pydatetime()
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt

        except Exception as ex:
            logger.warning(f"Ошибка при парсинге TIMESTAMPTZ: {value} — {str(ex)}")
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)

@type_handler_registry.register(["BOOLEAN", "BIT", "BOOL"])
class BooleanHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()


@type_handler_registry.register(["JSON", "JSONB", "BINARY_JSON", "NESTED"])
class JsonHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str):
                return json.loads(value)
            elif isinstance(value, (dict, list)):
                return value
            else:
                return json.loads(json.dumps(value))
        except Exception as e:
            logger.warning(f"Ошибка обработки JSON-поля: {str(e)}")
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.JSON()


@type_handler_registry.register(["UUID"])
class UuidHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None
        return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.String(36)


@type_handler_registry.register(["ARRAY", "SET"])
class ArrayHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, (list, tuple)):
                return list(value)
            if isinstance(value, str):
                parsed = json.loads(value)
                return list(parsed) if isinstance(parsed, (list, tuple)) else [parsed]
            return [value]
        except Exception as e:
            logger.warning(f"Ошибка обработки массива: {str(e)}")
            return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        try:
            test_value = field.get("value")
            if test_value and not self.is_null(test_value):
                self.handle(field, {})
            return sa.JSON()
        except Exception:
            logger.warning(
                "Не удалось использовать JSON для массива, используется Text")
            return sa.Text()


@type_handler_registry.register(["GEOMETRY"])
class GeometryHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str):
                # Try to parse as WKT (Well-Known Text)
                if value.startswith(('POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT',
                                   'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION')):
                    return value
                # Try to parse as GeoJSON
                try:
                    geojson = json.loads(value)
                    if geojson.get("type") and geojson.get("coordinates"):
                        return value
                except json.JSONDecodeError:
                    pass
            return str(value)
        except Exception as e:
            logger.warning(f"Ошибка обработки GEOMETRY-поля: {str(e)}")
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Text()  # Используем Text для хранения WKT/GeoJSON представления


@type_handler_registry.register(["POINT"])
class PointHandler(GeometryHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str):
                # Try to parse as WKT POINT
                if value.upper().startswith('POINT'):
                    return value
                # Try to parse as GeoJSON Point
                try:
                    geojson = json.loads(value)
                    if geojson.get("type", "").upper() == "POINT" and isinstance(geojson.get("coordinates"), list):
                        return value
                except json.JSONDecodeError:
                    pass
                # Try to parse as coordinates string "x y" or "x,y"
                coords = value.replace(',', ' ').split()
                if len(coords) == 2:
                    return f"POINT({' '.join(coords)})"
            elif isinstance(value, (list, tuple)) and len(value) == 2:
                return f"POINT({' '.join(map(str, value))})"
            return str(value)
        except Exception as e:
            logger.warning(f"Ошибка обработки POINT-поля: {str(e)}")
            return None


@type_handler_registry.register(["LINESTRING"])
class LinestringHandler(GeometryHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str):
                # Try to parse as WKT LINESTRING
                if value.upper().startswith('LINESTRING'):
                    return value
                # Try to parse as GeoJSON LineString
                try:
                    geojson = json.loads(value)
                    if geojson.get("type", "").upper() == "LINESTRING" and isinstance(geojson.get("coordinates"), list):
                        return value
                except json.JSONDecodeError:
                    pass
            elif isinstance(value, (list, tuple)):
                # Assume list of points
                points = []
                for point in value:
                    if isinstance(point, (list, tuple)) and len(point) == 2:
                        points.append(f"{point[0]} {point[1]}")
                    elif isinstance(point, str):
                        points.append(point.replace(',', ' '))
                if points:
                    return f"LINESTRING({', '.join(points)})"
            return str(value)
        except Exception as e:
            logger.warning(f"Ошибка обработки LINESTRING-поля: {str(e)}")
            return None


@type_handler_registry.register(["POLYGON"])
class PolygonHandler(GeometryHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, str):
                # Try to parse as WKT POLYGON
                if value.upper().startswith('POLYGON'):
                    return value
                # Try to parse as GeoJSON Polygon
                try:
                    geojson = json.loads(value)
                    if geojson.get("type", "").upper() == "POLYGON" and isinstance(geojson.get("coordinates"), list):
                        return value
                except json.JSONDecodeError:
                    pass
            elif isinstance(value, (list, tuple)):
                # Assume list of rings (each ring is a list of points)
                rings = []
                for ring in value:
                    if isinstance(ring, (list, tuple)):
                        points = []
                        for point in ring:
                            if isinstance(point, (list, tuple)) and len(point) == 2:
                                points.append(f"{point[0]} {point[1]}")
                            elif isinstance(point, str):
                                points.append(point.replace(',', ' '))
                        if points:
                            rings.append(f"({', '.join(points)})")
                if rings:
                    return f"POLYGON({', '.join(rings)})"
            return str(value)
        except Exception as e:
            logger.warning(f"Ошибка обработки POLYGON-поля: {str(e)}")
            return None

@type_handler_registry.register(["ENUM"])
class EnumHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        enum_values = field.get("enum_values", [])
        if value in enum_values:
            return value
        return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        enum_values = field.get("enum_values", [])
        return sa.Enum(*enum_values) if enum_values else sa.Text()


class DefaultHandler(BaseFieldHandler):
    """Обработчик по умолчанию для неизвестных типов"""

    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None
        return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Text()


class DataFrameConverter(IDataFrameConverter):
    """Конвертер полей в DataFrame"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def convert_to_dataframe(self, fields: List[Dict[str, Any]],
                             options: Dict[str, Any]) -> pd.DataFrame:
        """Преобразовать поля в DataFrame"""
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))

        try:
            data: Dict[str, List[Any]] = {}
            dtypes: Dict[str, Any] = {}
            null_values = set(options.get("null_values", []))

            for field in fields:
                if not isinstance(field, dict):
                    continue

                name = field.get("name")
                if not name or not isinstance(name, str):
                    continue

                field_type = field.get("type", "")
                if not isinstance(field_type, str):
                    continue

                field_type = field_type.upper().strip()
                is_required = field.get("is_required", False)
                value = field.get("value")

                if value in null_values:
                    value = None

                try:
                    handler_class = self.type_handler_registry.get_handler(
                        field_type) or DefaultHandler
                    handler = handler_class()
                    handler.set_null_values(options.get("null_values", []))
                    value = handler.handle(field, options)

                    if is_required and value is None:
                        raise ValueError("Обязательное поле не может быть null")
                except Exception as ex:
                    if not is_required:
                        value = None
                    else:
                        raise DatabaseUploadFailed(
                            _("Ошибка преобразования поля %(name)s: %(error)s",
                              name=name, error=str(ex)))

                data[name] = [value]

                # Определение типа данных для pandas
                if field_type in (
                "TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT", "UINT8"):
                    dtypes[name] = "Int64"
                elif field_type in ("FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL",
                                    "BINARY_FLOAT", "BINARY_DOUBLE"):
                    dtypes[name] = "float64"
                elif field_type in ("DECIMAL", "NUMERIC", "NUMBER"):
                    dtypes[name] = "object"
                elif field_type in ("BOOLEAN", "BIT", "BOOL"):
                    dtypes[name] = "boolean"
                elif field_type in ("DATE", "TIME", "DATETIME", "TIMESTAMP",
                                    "DATETIME64"):
                    dtypes[name] = "datetime64[ns]"
                elif field_type in "TIMESTAMPTZ":
                    dtypes[name] = "datetime64[ns, UTC]"
                else:
                    dtypes[name] = "string"

            df = pd.DataFrame(data)

            for col, dtype in dtypes.items():
                try:
                    if dtype == "object":
                        df[col] = df[col].apply(
                            lambda x: Decimal(str(x)) if x is not None and str(
                                x) not in null_values else None)
                    else:
                        if null_values:
                            df[col] = df[col].apply(
                                lambda x: None if x in null_values else x)
                        df[col] = df[col].astype(dtype)
                except Exception as ex:
                    logger.warning("Ошибка преобразования столбца %s to type %s: %s",
                                   col, dtype, str(ex))

            index_col = options.get("index_column")
            if index_col:
                df.set_index(index_col, inplace=True)
                index_label = options.get("index_label")
                if index_label:
                    df.index.name = index_label

            return df

        except (pd.errors.ParserError, pd.errors.EmptyDataError,
                UnicodeDecodeError, ValueError) as ex:
            raise DatabaseUploadFailed(
                message=_("Ошибка парсинга: %(error)s", error=str(ex))
            ) from ex
        except Exception as ex:
            logger.exception("Ошибка создания DataFrame из полей")
            raise DatabaseUploadFailed(
                _("Не удалось создать DataFrame из полей")) from ex


class DatabaseLoader(IDatabaseLoader):
    """Загрузчик данных в базу данных"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def load_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> None:
        """Загрузить DataFrame в базу данных"""
        try:
            if df.empty:
                raise DatabaseUploadFailed(
                    message=_("Невозможно загрузить пустой DataFrame"))

            data_table = Table(table=table_name, schema=schema_name)

            dtype = {}
            for field in fields_metadata:
                if not isinstance(field, dict):
                    continue

                name = field.get("name")
                if name and name in df.columns:
                    handler_class = self.type_handler_registry.get_handler(
                        field.get("type", "")) or DefaultHandler
                    handler = handler_class()
                    dtype[name] = handler.get_sqlalchemy_type(field)

            null_values = options.get("null_values", [])
            if null_values:
                df = df.replace(null_values, None)
            else:
                df = df.where(pd.notnull(df), None)

            index_col = options.get("index_column")
            use_index = options.get("dataframe_index", False)
            index_label = options.get("index_label")
            already_exists = options.get("already_exists", "fail")

            if isinstance(index_label, str) and index_label.lower() == "undefined":
                index_label = None

            final_index_label = None
            if use_index:
                if index_label and index_label != '':
                    final_index_label = index_label
                elif index_col and index_col != '':
                    final_index_label = index_col
                else:
                    final_index_label = "id"

                if not index_col or index_col == '':
                    if already_exists == "append":
                        table_fullname = f"{schema_name}.{table_name}" if schema_name else table_name
                        try:
                            with database.get_sqla_engine() as engine:
                                with engine.connect() as conn:
                                    result = conn.execute(
                                        sa.text(
                                            f"SELECT COUNT(*) FROM {table_fullname}"))
                                    offset = result.scalar() or 0
                        except Exception as e:
                            logger.warning(
                                "Не удалось получить количество строк из таблицы %s: %s",
                                table_fullname, str(e))
                            offset = 0
                    else:
                        offset = 0

                    df.index = pd.RangeIndex(start=offset, stop=offset + len(df))
                    df.index.name = final_index_label

            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": already_exists,
                "index": use_index,
                "dtype": dtype,
            }

            if use_index and final_index_label:
                to_sql_kwargs["index_label"] = final_index_label

            database.db_engine_spec.df_to_sql(
                database,
                data_table,
                df,
                to_sql_kwargs=to_sql_kwargs,
            )

        except ValueError as ex:
            raise DatabaseUploadFailed(
                message=_(
                    "Таблица уже существует. Измените стратегию обработки существования таблицы на «append» или «replace» или укажите другое имя таблицы."
                )
            ) from ex
        except Exception as ex:
            logger.exception("Не удалось загрузить DataFrame в базу данных")
            raise DatabaseUploadFailed(exception=ex) from ex


class FieldsReader:
    """Основной класс для чтения и обработки полей"""

    def __init__(
        self,
        options: Optional[FieldsReaderOptions] = None,
    ) -> None:
        self._options = options or {}
        self._type_handler_registry = type_handler_registry
        self._dataframe_converter = DataFrameConverter(self._type_handler_registry)
        self._database_loader = DatabaseLoader(self._type_handler_registry)

    def read(
        self,
        fields: List[Dict[str, Any]],
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        """Основной метод для чтения и загрузки данных"""
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))

        df = self._dataframe_converter.convert_to_dataframe(fields, self._options)
        self._database_loader.load_to_database(
            df, database, table_name, schema_name, fields, self._options)

    def fields_metadata(self, fields: List[Dict[str, Any]]) -> FieldsMetadata:
        """Генерация метаданных полей"""
        try:
            df = self._dataframe_converter.convert_to_dataframe(fields, self._options)
            return {
                "items": [
                    {
                        "column_names": list(df.columns),
                        "num_rows": len(df),
                        "num_columns": len(df.columns),
                    }
                ]
            }
        except Exception:
            return {"items": []}


class FieldsUploadCommand(BaseCommand):
    def __init__(
        self,
        model_id: int,
        table_name: str,
        upload_fields: Any,
        schema: Optional[str],
        reader: FieldsReader,
    ) -> None:
        self._model_id = model_id
        self._model: Optional[Database] = None
        self._table_name = table_name
        self._schema = schema
        self._fields = upload_fields
        self._reader = reader

    @transaction(on_error=partial(on_error, reraise=DatabaseUploadSaveMetadataFailed))
    def run(self) -> None:
        """Выполнить команду загрузки"""
        self.validate()
        if not self._model:
            return

        try:
            self._reader.read(self._fields, self._model, self._table_name, self._schema)
        except Exception as ex:
            logger.exception("Ошибка загрузки полей в базу данных")
            raise

        self._create_or_update_sqla_table()

    def _create_or_update_sqla_table(self) -> None:
        """Создать или обновить метаданные таблицы"""
        sqla_table = (
            db.session.query(SqlaTable)
            .filter_by(
                table_name=self._table_name,
                schema=self._schema,
                database_id=self._model_id,
            )
            .one_or_none()
        )

        if not sqla_table:
            sqla_table = SqlaTable(
                table_name=self._table_name,
                database=self._model,
                database_id=self._model_id,
                owners=[get_user()],
                schema=self._schema,
            )
            db.session.add(sqla_table)

        try:
            sqla_table.fetch_metadata()
            db.session.commit()
        except Exception as ex:
            db.session.rollback()
            logger.exception("Не удалось сохранить метаданные таблицы.")
            raise DatabaseUploadSaveMetadataFailed() from ex

    def validate(self) -> None:
        """Проверить входные параметры"""
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()

        if not self._table_name or not isinstance(self._table_name, str):
            raise DatabaseUploadFailed(message=_("Имя таблицы должно быть указано"))

        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()

        if not isinstance(self._fields, list) or not self._fields:
            raise DatabaseUploadFailed(message=_("Не указано полей для загрузки"))
# endregion
