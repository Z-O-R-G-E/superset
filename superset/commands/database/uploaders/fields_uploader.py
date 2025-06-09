import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import partial
from typing import Any, Optional, TypedDict, List, Dict
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
        kwargs = {
            "index_col": self._options.get("index_column"),
            "dayfirst": self._options.get("day_first", False),
            "keep_default_na": not self._options.get("null_values"),
            "na_values": self._options.get("null_values") or None,
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
                            lambda x: Decimal(str(x)) if x is not None else None)
                    else:
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
        try:
            return int(value) if value is not None else None
        except (ValueError, TypeError):
            return None

    def _handle_float(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        try:
            return float(value) if value is not None else None
        except (ValueError, TypeError):
            return None

    def _handle_decimal(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None

        precision = field.get("precision", 18)
        scale = field.get("scale", 4)

        try:
            decimal_value = Decimal(str(value))
            return decimal_value.quantize(Decimal(10) ** -scale, rounding=ROUND_HALF_UP)
        except (ValueError, InvalidOperation):
            return None

    def _handle_string(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None

        size = field.get("size")
        value_str = str(value)

        if size is not None and isinstance(size, int):
            return value_str[:size]
        return value_str

    def _handle_binary(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None
        return value.encode() if isinstance(value, str) else value

    def _handle_date(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
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
        if value is None:
            return None
        try:
            return pd.to_datetime(value).time()
        except (ValueError, TypeError):
            return None

    def _handle_datetime(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None
        try:
            day_first = self._options.get("day_first", False)
            if day_first:
                return pd.to_datetime(value, dayfirst=True)
            else:
                return pd.to_datetime(value, format='%Y-%d-%m')
        except (ValueError, TypeError):
            return None

    def _handle_datetime_tz(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
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
        if value is None:
            return None
        try:
            return pd.to_timedelta(value)
        except (ValueError, TypeError):
            return None

    def _handle_boolean(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None

        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def _handle_json(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None

        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

    def _handle_uuid(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        return str(value) if value is not None else None

    def _handle_array(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
            return None

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
                return [parsed]
            except json.JSONDecodeError:
                if ',' in value:
                    return [v.strip() for v in value.split(',')]
                return [value]
        elif isinstance(value, (list, tuple)):
            return list(value)
        else:
            return [value]

    def _handle_enum(self, params: Dict[str, Any]) -> Any:
        field = params['field']
        value = field.get("value")
        if value is None:
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

        if field_type in ("TINYINT", "SMALLINT"):
            sql_type = sa.SmallInteger()
        elif field_type in ("INT", "INTEGER"):
            sql_type = sa.Integer()
        elif field_type == "BIGINT":
            sql_type = sa.BigInteger()
        elif field_type == "UINT8":
            sql_type = sa.BigInteger()
        elif field_type in ("FLOAT", "FLOAT32"):
            sql_type = sa.Float(32)
        elif field_type in ("FLOAT64", "DOUBLE", "REAL", "BINARY_FLOAT", "BINARY_DOUBLE"):
            sql_type = sa.Float()
        elif field_type in ("DECIMAL", "NUMERIC", "NUMBER"):
            sql_type = sa.Numeric(precision=precision, scale=scale)
        elif field_type == "CHAR":
            sql_type = sa.CHAR(size or 255)
        elif field_type == "VARCHAR":
            sql_type = sa.VARCHAR(size) if size else sa.Text()
        elif field_type in ("TEXT", "CLOB", "LONGTEXT", "STRING"):
            sql_type = sa.Text()
        elif field_type in ("NCHAR", "NVARCHAR"):
            sql_type = sa.NCHAR(size) if size else sa.UnicodeText()
        elif field_type == "FIXEDSTRING":
            sql_type = sa.CHAR(size or 255)
        elif field_type in ("BINARY", "VARBINARY", "BLOB", "BYTEA", "RAW"):
            sql_type = sa.LargeBinary()
        elif field_type == "DATE":
            sql_type = sa.Date()
        elif field_type == "TIME":
            sql_type = sa.Time()
        elif field_type in ("DATETIME", "TIMESTAMP", "DATETIME64"):
            sql_type = sa.DateTime()
        elif field_type == "TIMESTAMPTZ":
            sql_type = sa.DateTime(timezone=True)
        elif field_type == "INTERVAL":
            sql_type = sa.Interval()
        elif field_type in ("BOOLEAN", "BOOL", "BIT"):
            sql_type = sa.Boolean()
        elif field_type in ("JSON", "JSONB", "BINARY_JSON"):
            sql_type = sa.JSON()
        elif field_type == "UUID":
            sql_type = sa.String(36)
        elif field_type == "XML":
            sql_type = sa.Text()
        elif field_type in ("GEOMETRY", "POINT", "LINESTRING", "POLYGON", "GEOJSON"):
            sql_type = sa.Text()
        elif field_type in ("IPV4", "IPV6"):
            sql_type = sa.String(45)
        elif field_type == "ARRAY":
            return sa.ARRAY(sa.String)
        elif field_type == "ENUM" and enum_values:
            sql_type = sa.Enum(*enum_values)
        else:
            sql_type = sa.Text()

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
                raise DatabaseUploadFailed(message=_("Невозможно загрузить пустой DataFrame"))

            data_table = Table(table=table_name, schema=schema_name)

            dtype = {}
            for field in self._fields:
                if not isinstance(field, dict):
                    continue

                name = field.get("name")
                if name and name in df.columns:
                    dtype[name] = self._get_sqlalchemy_type(field)

            df = df.where(pd.notnull(df), None)

            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": self._options.get("already_exists", "fail"),
                "index": self._options.get("dataframe_index", False),
                "dtype": dtype,
            }

            index_label = self._options.get("index_label")
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
