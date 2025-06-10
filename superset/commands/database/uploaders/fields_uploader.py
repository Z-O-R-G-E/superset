import base64
import logging
import string
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import partial
from typing import Any, Optional, TypedDict, List, Dict, re
import sqlalchemy as sa
import pandas as pd
import json
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

class FieldsReader:
    def __init__(
        self,
        options: Optional[FieldsReaderOptions] = None,
    ) -> None:
        self._options = options or {}
        self._fields: List[Dict[str, Any]] = []
        self._initialize_type_handlers()

    def _initialize_type_handlers(self) -> None:
        """Инициализация обработчиков для разных типов данных"""
        self._type_handlers = {
            # Integer types
            "TINYINT": self._handle_integer,
            "SMALLINT": self._handle_integer,
            "INT": self._handle_integer,
            "INTEGER": self._handle_integer,
            "BIGINT": self._handle_integer,
            "UINT8": self._handle_integer,

            # Floating point
            "FLOAT": self._handle_float,
            "FLOAT32": self._handle_float,
            "FLOAT64": self._handle_float,
            "DOUBLE": self._handle_float,
            "REAL": self._handle_float,
            "BINARY_FLOAT": self._handle_float,
            "BINARY_DOUBLE": self._handle_float,

            # Decimal
            "DECIMAL": self._handle_decimal,
            "NUMERIC": self._handle_decimal,
            "NUMBER": self._handle_decimal,

            # String
            "CHAR": self._handle_string,
            "VARCHAR": self._handle_string,
            "TEXT": self._handle_string,
            "NCHAR": self._handle_string,
            "NVARCHAR": self._handle_string,
            "CLOB": self._handle_string,
            "LONGTEXT": self._handle_string,
            "FIXEDSTRING": self._handle_string,
            "STRING": self._handle_string,

            # Binary
            "BINARY": self._handle_binary,
            "VARBINARY": self._handle_binary,
            "BLOB": self._handle_binary,
            "BYTEA": self._handle_binary,
            "RAW": self._handle_binary,

            # Date/time
            "DATE": self._handle_date,
            "TIME": self._handle_time,
            "DATETIME": self._handle_datetime,
            "TIMESTAMP": self._handle_datetime,
            "DATETIME64": self._handle_datetime,
            "TIMESTAMPTZ": self._handle_datetime_tz,
            "INTERVAL": self._handle_interval,

            # Boolean
            "BOOLEAN": self._handle_boolean,
            "BIT": self._handle_boolean,
            "BOOL": self._handle_boolean,

            # JSON
            "JSON": self._handle_json,
            "JSONB": self._handle_json,
            "BINARY_JSON": self._handle_json,

            # Special
            "UUID": self._handle_uuid,
            "XML": self._handle_string,
            "GEOMETRY": self._handle_string,
            "POINT": self._handle_string,
            "LINESTRING": self._handle_string,
            "POLYGON": self._handle_string,
            "GEOJSON": self._handle_string,
            "IPV4": self._handle_string,
            "IPV6": self._handle_string,

            # Complex
            "ARRAY": self._handle_array,
            "ENUM": self._handle_enum,
            "SET": self._handle_array,
            "NESTED": self._handle_json,
        }

    def read(
        self,
        fields: List[Dict[str, Any]],
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        """Основной метод для чтения и загрузки данных"""
        if not fields:
            raise DatabaseUploadFailed(message=_("Нет полей для загрузки"))

        self._fields = fields
        df = self.fields_to_dataframe(fields)
        self._dataframe_to_database(df, database, table_name, schema_name)

    def fields_to_dataframe(self, fields: List[Dict[str, Any]]) -> pd.DataFrame:
        """Преобразовать поля в DataFrame"""
        null_values = self._options.get("null_values", [])
        kwargs = {
            "index_col": self._options.get("index_column"),
            "dayfirst": self._options.get("day_first", False),
            "keep_default_na": not null_values,
            "na_values": null_values or None,
        }
        return self._read_fields(fields, kwargs)

    def _read_fields(
        self,
        fields: List[Dict[str, Any]],
        kwargs: Dict[str, Any]
    ) -> pd.DataFrame:
        """Чтение полей и создание DataFrame"""
        try:
            data: Dict[str, List[Any]] = {}
            dtypes: Dict[str, Any] = {}
            null_values = set(self._options.get("null_values", []))

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
                    handler = self._type_handlers.get(field_type, self._handle_string)
                    if not callable(handler):
                        raise ValueError(
                            f"Обработчик для типа {field_type} не может быть вызван")
                    value = handler({'field': field})
                except Exception as ex:
                    if not is_required:
                        value = None
                    else:
                        raise DatabaseUploadFailed(
                            message=_("Ошибка преобразования поля %(name)s: %(error)s",
                                      name=name, error=str(ex)))

                data[name] = [value]

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
                                    "DATETIME64", "TIMESTAMPTZ", "INTERVAL"):
                    dtypes[name] = "datetime64[ns]"
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

            if kwargs.get("index_col"):
                df.set_index(kwargs["index_col"], inplace=True)
                if kwargs.get("index_label"):
                    df.index.name = kwargs["index_label"]

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

    def _handle_integer(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            if isinstance(value, str) and '.' in value:
                value = value.split('.')[0]
            return int(float(value)) if isinstance(value, str) else int(value)
        except (ValueError, TypeError):
            return None

    def _handle_float(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _handle_decimal(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        precision = field.get("precision", 18)
        scale = field.get("scale", 4)

        try:
            if isinstance(value, float):
                value = str(value)
            decimal_value = Decimal(str(value))
            return decimal_value.quantize(
                Decimal(10) ** -scale,
                rounding=ROUND_HALF_UP
            )
        except (ValueError, InvalidOperation, TypeError):
            return None

    def _handle_string(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        size = field.get("size")
        value_str = str(value)

        if size is not None and isinstance(size, int):
            return value_str[:size]
        return value_str

    def _handle_binary(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        try:
            if isinstance(value, str):
                if value.startswith('\\x') or all(c in string.hexdigits for c in value):
                    return bytes.fromhex(value.replace('\\x', ''))
                elif re.match(r'^[A-Za-z0-9+/=]+$', value):
                    return base64.b64decode(value)
                return value.encode('utf-8')
            elif isinstance(value, (bytes, bytearray)):
                return bytes(value)
            else:
                return str(value).encode('utf-8')
        except Exception as ex:
            logger.warning("Ошибка преобразования в бинарный формат: %s", str(ex))
            return None

    def _handle_date(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            day_first = self._options.get("day_first", False)
            if day_first:
                return pd.to_datetime(value, dayfirst=True).date()
            else:
                return pd.to_datetime(value, format='%Y-%d-%m').date()
        except (ValueError, TypeError):
            return None

    def _handle_time(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            return pd.to_datetime(value).time()
        except (ValueError, TypeError):
            return None

    def _handle_datetime(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            day_first = self._options.get("day_first", False)
            if isinstance(value, str):
                if len(value.split('-')[0]) == 4 and not day_first:
                    return pd.to_datetime(value, format='%Y-%m-%d')
                return pd.to_datetime(value, dayfirst=day_first)
            return pd.to_datetime(value)
        except (ValueError, TypeError):
            return None

    def _handle_datetime_tz(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            day_first = self._options.get("day_first", False)
            if day_first:
                return pd.to_datetime(value, dayfirst=True, utc=True)
            else:
                return pd.to_datetime(value, format='%Y-%d-%m', utc=True)
        except (ValueError, TypeError):
            return None

    def _handle_interval(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        try:
            return pd.to_timedelta(value)
        except (ValueError, TypeError):
            return None

    def _handle_boolean(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def _handle_json(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        elif isinstance(value, (dict, list)):
            return value
        else:
            try:
                return json.loads(str(value))
            except json.JSONDecodeError:
                return str(value)

    def _handle_uuid(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None
        return str(value)

    def _handle_array(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else [parsed]
            except json.JSONDecodeError:
                if ',' in value:
                    return [v.strip() for v in value.split(',') if v.strip()]
                return [value] if value else []
        elif isinstance(value, (list, tuple)):
            return list(value)
        else:
            return [value]

    def _handle_enum(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        null_values = self._options.get("null_values", [])

        if value is None or value in null_values:
            return None

        enum_values = field.get("enum_values", [])
        if value in enum_values:
            return value
        return None

    def _get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        """Получить тип SQLAlchemy для поля"""
        field_type = field.get("type", "").upper().strip()
        size = field.get("size")
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)
        enum_values = field.get("enum_values", [])
        is_required = field.get("is_required", False)

        type_map = {
            # Целочисленные типы
            "TINYINT": sa.SmallInteger(),
            "SMALLINT": sa.SmallInteger(),
            "INT": sa.Integer(),
            "INTEGER": sa.Integer(),
            "BIGINT": sa.BigInteger(),
            "UINT8": sa.BigInteger(),

            # Числа с плавающей точкой
            "FLOAT": sa.Float(precision=24),
            "FLOAT32": sa.Float(precision=24),
            "FLOAT64": sa.Float(),
            "DOUBLE": sa.Float(),
            "REAL": sa.Float(),
            "BINARY_FLOAT": sa.Float(),
            "BINARY_DOUBLE": sa.Float(),

            # Decimal/Numeric
            "DECIMAL": sa.Numeric(precision=precision, scale=scale),
            "NUMERIC": sa.Numeric(precision=precision, scale=scale),
            "NUMBER": sa.Numeric(precision=precision, scale=scale),

            # Строковые типы
            "CHAR": sa.CHAR(size or 255),
            "VARCHAR": sa.VARCHAR(size) if size else sa.Text(),
            "TEXT": sa.Text(),
            "NCHAR": sa.NCHAR(size) if size else sa.UnicodeText(),
            "NVARCHAR": sa.NVARCHAR(size) if size else sa.UnicodeText(),
            "STRING": sa.Text(),

            # Бинарные данные
            "BINARY": sa.LargeBinary(length=size),
            "VARBINARY": sa.LargeBinary(length=size),
            "BLOB": sa.LargeBinary(),
            "BYTEA": sa.LargeBinary(),
            "RAW": sa.LargeBinary(),

            # Дата/время
            "DATE": sa.Date(),
            "TIME": sa.Time(),
            "DATETIME": sa.DateTime(),
            "TIMESTAMP": sa.DateTime(),
            "TIMESTAMPTZ": sa.DateTime(timezone=True),
            "INTERVAL": sa.Interval(),

            # Логические
            "BOOLEAN": sa.Boolean(),
            "BOOL": sa.Boolean(),
            "BIT": sa.Boolean(),

            # Специальные
            "UUID": sa.String(36),
            "XML": sa.Text(),
            "JSON": sa.JSON(),
            "GEOJSON": sa.JSON(),
            "IPV4": sa.String(45),
            "IPV6": sa.String(45),
        }

        sql_type = type_map.get(field_type, sa.Text())

        # Обработка ENUM и ARRAY
        if field_type == "ENUM" and enum_values:
            sql_type = sa.Enum(*enum_values)
        elif field_type == "ARRAY":
            sql_type = sa.ARRAY(sa.String)

        sql_type.nullable = not is_required
        return sql_type

    def _dataframe_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        """Загрузить DataFrame в базу данных"""
        try:
            if df.empty:
                raise DatabaseUploadFailed(
                    message=_("Невозможно загрузить пустой DataFrame"))

            data_table = Table(table=table_name, schema=schema_name)

            dtype = {}
            for field in self._fields:
                if not isinstance(field, dict):
                    continue

                name = field.get("name")
                if name and name in df.columns:
                    dtype[name] = self._get_sqlalchemy_type(field)

            null_values = self._options.get("null_values", [])
            if null_values:
                df = df.replace(null_values, None)
            else:
                df = df.where(pd.notnull(df), None)

            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": self._options.get("already_exists", "fail"),
                "index": self._options.get("dataframe_index", False),
                "dtype": dtype,
            }

            index_label = self._options.get("index_label",'index')
            if index_label and self._options.get("dataframe_index"):
                to_sql_kwargs["index_label"] = index_label

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

    def fields_metadata(self, fields: List[Dict[str, Any]]) -> FieldsMetadata:
        """Генерация метаданных полей"""
        try:
            df = self.fields_to_dataframe(fields)
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
