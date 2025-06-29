import logging
from datetime import timezone, time, datetime, date
from decimal import Decimal, ROUND_HALF_UP
from functools import partial, lru_cache
from typing import Any, Optional, TypedDict, List, Dict, Type, Union
from abc import ABC, abstractmethod
import sqlalchemy as sa
from dateutil.parser import isoparse
from sqlalchemy import inspect
import pandas as pd
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

# Конфигурационные константы
READ_CHUNK_SIZE = 1000
MAX_DECIMAL_PRECISION = 38
MAX_STRING_LENGTH = 65535

TYPE_MAPPING = {
    # Целые числа
    "TINYINT": {"pandas": "Int64", "handler": "IntegerHandler"},
    "SMALLINT": {"pandas": "Int64", "handler": "IntegerHandler"},
    "INT": {"pandas": "Int64", "handler": "IntegerHandler"},
    "INTEGER": {"pandas": "Int64", "handler": "IntegerHandler"},
    "BIGINT": {"pandas": "Int64", "handler": "IntegerHandler"},
    "UINT8": {"pandas": "Int64", "handler": "IntegerHandler"},

    # Числа с плавающей точкой
    "FLOAT": {"pandas": "float64", "handler": "FloatHandler"},
    "FLOAT32": {"pandas": "float32", "handler": "FloatHandler"},
    "FLOAT64": {"pandas": "float64", "handler": "FloatHandler"},
    "DOUBLE": {"pandas": "float64", "handler": "FloatHandler"},
    "REAL": {"pandas": "float64", "handler": "FloatHandler"},
    "BINARY_FLOAT": {"pandas": "float32", "handler": "FloatHandler"},
    "BINARY_DOUBLE": {"pandas": "float64", "handler": "FloatHandler"},

    # Десятичные числа
    "DECIMAL": {"pandas": "object", "handler": "DecimalHandler"},
    "NUMERIC": {"pandas": "object", "handler": "DecimalHandler"},
    "NUMBER": {"pandas": "object", "handler": "DecimalHandler"},

    # Логические значения
    "BOOLEAN": {"pandas": "boolean", "handler": "BooleanHandler"},
    "BIT": {"pandas": "boolean", "handler": "BooleanHandler"},
    "BOOL": {"pandas": "boolean", "handler": "BooleanHandler"},

    # Даты и время
    "DATE": {"pandas": "datetime64[ns]", "handler": "DateHandler"},
    "TIME": {"pandas": "object", "handler": "TimeHandler"},
    "DATETIME": {"pandas": "datetime64[ns]", "handler": "DateTimeHandler"},
    "TIMESTAMP": {"pandas": "datetime64[ns]", "handler": "DateTimeHandler"},
    "DATETIME64": {"pandas": "datetime64[ns]", "handler": "DateTimeHandler"},
    "TIMESTAMPTZ": {"pandas": "datetime64[ns, UTC]", "handler": "DateTimeTzHandler"},

    # Строки
    "CHAR": {"pandas": "string", "handler": "StringHandler"},
    "VARCHAR": {"pandas": "string", "handler": "StringHandler"},
    "TEXT": {"pandas": "string", "handler": "StringHandler"},
    "NCHAR": {"pandas": "string", "handler": "StringHandler"},
    "NVARCHAR": {"pandas": "string", "handler": "StringHandler"},
    "CLOB": {"pandas": "string", "handler": "StringHandler"},
    "LONGTEXT": {"pandas": "string", "handler": "StringHandler"},
    "FIXEDSTRING": {"pandas": "string", "handler": "StringHandler"},
    "STRING": {"pandas": "string", "handler": "StringHandler"},
}


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
    datetime_format: Optional[str]


class IFieldHandler(ABC):
    """Абстрактный базовый класс для обработчиков полей"""

    @abstractmethod
    def handle(self, value: Any) -> Any:
        """Обработать значение поля"""
        pass

    @abstractmethod
    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        """Получить соответствующий тип SQLAlchemy"""
        pass


class IDataFrameConverter(ABC):
    """Абстракция для конвертации полей в DataFrame"""

    @abstractmethod
    def convert_to_dataframe(
        self,
        fields: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> pd.DataFrame:
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


class NullChecker:
    """Класс для централизованной проверки значений на null"""

    def __init__(self, null_values: List[str] = None):
        # Обрабатываем экранированные кавычки при инициализации
        processed_null_values = []
        if null_values:
            for val in null_values:
                if val == '""':  # Специальная обработка для экранированных кавычек
                    processed_null_values.append("")
                else:
                    processed_null_values.append(val)
        self.null_values = set(processed_null_values or [])

    def is_null(self, value: Any, field_type: Optional[str] = None) -> bool:
        """Проверить, является ли значение NULL"""
        if value is None:
            return True

        if isinstance(value, str):
            value = value.strip()
            if not value or value.upper() == "NULL":
                return True

            if field_type and field_type.upper() in [t for t, m in TYPE_MAPPING.items()
                                                   if m.get("handler") == "StringHandler"]:
                return value in self.null_values

            return False

        return value in self.null_values

    def process_value(self, value: Any, field_type: Optional[str] = None) -> Any:
        """Обработать значение с учетом его типа и null-правил"""
        is_null = self.is_null(value, field_type)

        if field_type and field_type.upper() in [t for t, m in TYPE_MAPPING.items() if
                                               m.get("handler") == "StringHandler"]:
            if isinstance(value, str):
                value = value.strip()
                if is_null:
                    if "" not in self.null_values and value == "":
                        return ""
                    return None
                return value
            elif is_null:
                return None
            return str(value)

        if is_null:
            return None
        return value


class TypeHandlerRegistry:
    """Реестр обработчиков типов данных"""

    def __init__(self):
        self._handlers: Dict[str, Type[IFieldHandler]] = {}
        self._handler_instances: Dict[str, IFieldHandler] = {}

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

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""
        mapping = TYPE_MAPPING.get(type_name.upper(), {})
        return mapping.get("pandas", "string")

    @lru_cache(maxsize=32)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Получить экземпляр обработчика для типа"""
        handler_class = self._handlers.get(type_name.upper())
        if not handler_class:
            return DefaultHandler()
        if type_name not in self._handler_instances:
            self._handler_instances[type_name] = handler_class()
        return self._handler_instances[type_name]


type_handler_registry = TypeHandlerRegistry()


class DefaultHandler(IFieldHandler):
    """Обработчик по умолчанию для неизвестных типов"""

    def handle(self, value: Any) -> Any:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Text()


class DataFrameConverter(IDataFrameConverter):
    """Конвертер полей в DataFrame"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def convert_to_dataframe(
        self,
        fields: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> pd.DataFrame:
        """Преобразовать поля в DataFrame"""
        self._validate_fields(fields)

        null_checker = NullChecker(options.get("null_values"))
        data = {}
        dtypes = {}

        for field in fields:
            name = field.get("name")
            if not name or not isinstance(name, str):
                continue

            field_type = (field.get("type", "") or "").upper().strip()
            handler = self.type_handler_registry.get_handler_instance(field_type)
            value = field.get("value")

            try:
                processed_value = null_checker.process_value(value, field_type)

                if processed_value is not None:
                    processed_value = handler.handle(processed_value)

                data[name] = [processed_value]
                dtypes[name] = self.type_handler_registry.get_pandas_type(field_type)
            except Exception as ex:
                raise DatabaseUploadFailed(
                    _("Ошибка преобразования поля %(name)s: %(error)s",
                      name=name, error=str(ex)))

        if not data:
            raise DatabaseUploadFailed(_("Нет допустимых полей для загрузки"))

        df = pd.DataFrame(data)
        self._apply_dtypes(df, dtypes)
        self._process_index(df, options)
        return df

    def _validate_fields(self, fields: List[Dict[str, Any]]) -> None:
        """Валидация входных полей"""
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))
        if not all(isinstance(field, dict) for field in fields):
            raise DatabaseUploadFailed(_("Все поля должны быть словарями"))

    def _apply_dtypes(self, df: pd.DataFrame, dtypes: Dict[str, Any]) -> None:
        """Применить типы данных к DataFrame"""
        for col, dtype in dtypes.items():
            try:
                df[col] = df[col].astype(dtype, errors="ignore")
            except Exception as ex:
                logger.warning("Ошибка преобразования столбца %s к типу %s: %s",
                               col, dtype, str(ex))

    def _process_index(self, df: pd.DataFrame, options: Dict[str, Any]) -> None:
        """Обработать индекс DataFrame"""
        index_col = options.get("index_column")
        if index_col and index_col in df.columns:
            df.set_index(index_col, inplace=True)
            index_label = options.get("index_label")
            if index_label:
                df.index.name = index_label


class DatabaseLoader(IDatabaseLoader):
    """Загрузчик данных в БД"""

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
        self._validate_input(df, database, table_name)

        if schema_name:
            self._validate_schema(database, schema_name)

        dtype = self._get_column_types(df, fields_metadata)
        to_sql_kwargs = self._prepare_to_sql_kwargs(df, options, dtype)
        self._execute_dataframe_upload(database, table_name, schema_name, df,
                                       to_sql_kwargs)

    def _validate_input(self, df: pd.DataFrame, database: Database,
                        table_name: str) -> None:
        """Проверить входные параметры"""
        if df.empty:
            raise DatabaseUploadFailed(_("Невозможно загрузить пустой DataFrame"))
        if not table_name or not isinstance(table_name, str):
            raise DatabaseUploadFailed(_("Неверное имя таблицы"))
        if not database:
            raise DatabaseUploadFailed(_("База данных не указана"))

    def _validate_schema(self, database: Database, schema_name: str) -> None:
        """Проверить существование схемы"""
        try:
            with database.get_sqla_engine() as engine:
                inspector = inspect(engine)
                schemas = inspector.get_schema_names()
                if schema_name not in schemas:
                    raise DatabaseUploadFailed(
                        _("Схема '%(schema_name)s' не найдена в базе данных",
                          schema_name=schema_name))
        except Exception as ex:
            logger.exception("Ошибка при проверке существования схемы")
            raise DatabaseUploadFailed(
                _("Не удалось проверить существование схемы")) from ex

    def _get_column_types(
        self,
        df: pd.DataFrame,
        fields_metadata: List[Dict[str, Any]]
    ) -> Dict[str, sa.types.TypeEngine]:
        """Получить типы столбцов для SQLAlchemy"""
        type_map = {}

        for field in fields_metadata:
            if not isinstance(field, dict):
                continue

            name = field.get("name")
            if name and name in df.columns:
                handler = self.type_handler_registry.get_handler_instance(
                    field.get("type", ""))
                type_map[name] = handler.get_sqlalchemy_type(field)

        for col in df.columns:
            if col not in type_map:
                sample = df[col].dropna().iloc[0] if not df[
                    col].dropna().empty else None
                type_map[col] = self._infer_sqlalchemy_type(sample)

        return type_map

    def _infer_sqlalchemy_type(self, sample: Any) -> sa.types.TypeEngine:
        """Определить тип SQLAlchemy по образцу данных"""
        if sample is None:
            return sa.Text()
        elif isinstance(sample, bool):
            return sa.Boolean()
        elif isinstance(sample, int):
            return sa.BigInteger() if sample > 2 ** 31 - 1 else sa.Integer()
        elif isinstance(sample, float):
            return sa.Float()
        elif isinstance(sample, Decimal):
            return sa.Numeric(precision=MAX_DECIMAL_PRECISION, scale=12)
        elif isinstance(sample, datetime):
            return sa.DateTime()
        elif isinstance(sample, date):
            return sa.Date()
        elif isinstance(sample, time):
            return sa.Time()
        elif isinstance(sample, str):
            return sa.String(MAX_STRING_LENGTH)
        return sa.Text()

    def _prepare_to_sql_kwargs(
        self,
        df: pd.DataFrame,
        options: Dict[str, Any],
        dtype: Dict[str, sa.types.TypeEngine]
    ) -> Dict[str, Any]:
        """Подготовить параметры для метода to_sql"""
        return {
            "chunksize": READ_CHUNK_SIZE,
            "if_exists": options.get("already_exists", "fail"),
            "index": options.get("dataframe_index", False),
            "dtype": dtype,
            "method": None,
            "index_label": options.get("index_label")
        }

    def _execute_dataframe_upload(
        self,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
        df: pd.DataFrame,
        to_sql_kwargs: Dict[str, Any]
    ) -> None:
        """Выполнить загрузку DataFrame в базу данных"""
        database.db_engine_spec.df_to_sql(
            database,
            Table(table=table_name, schema=schema_name),
            df,
            to_sql_kwargs=to_sql_kwargs,
        )


class FieldsReader:
    """Читатель полей"""

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
        self._validate_input(fields, database, table_name)
        df = self._dataframe_converter.convert_to_dataframe(fields, self._options)
        self._database_loader.load_to_database(
            df, database, table_name, schema_name, fields, self._options)

    def _validate_input(
        self,
        fields: List[Dict[str, Any]],
        database: Database,
        table_name: str
    ) -> None:
        """Проверить входные параметры"""
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))
        if not database:
            raise DatabaseNotFoundError()
        if not table_name or not isinstance(table_name, str):
            raise DatabaseUploadFailed(_("Неверное имя таблицы"))


class FieldsUploadCommand(BaseCommand):
    """Команда загрузки полей"""

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

        self._reader.read(self._fields, self._model, self._table_name, self._schema)
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "IntegerHandler"
])
class IntegerHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "FloatHandler"
])
class FloatHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return float(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "DecimalHandler"
])
class DecimalHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        str_value = str(value).strip().replace(" ", "").replace(",", "")
        decimal_value = Decimal(str_value)

        scale = 4  # Можно добавить в параметры field
        if scale >= 0:
            return decimal_value.quantize(
                Decimal('0.' + '0' * scale),
                rounding=ROUND_HALF_UP
            )
        return decimal_value

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Numeric(
            precision=field.get("precision", 18),
            scale=field.get("scale", 4)
        )


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "StringHandler"
])
class StringHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        if size:
            return sa.VARCHAR(size)
        return sa.Text()


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "DateHandler"
])
class DateHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "TimeHandler"
])
class TimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, time):
            return value

        if isinstance(value, datetime):
            return value.time()

        if isinstance(value, str):
            # Пробуем разные форматы времени
            formats = [
                '%H:%M:%S.%f',  # С микросекундами
                '%H:%M:%S',  # Без микросекунд
                '%H:%M',  # Только часы и минуты
                '%I:%M:%S %p',  # 12-часовой формат с AM/PM
                '%I:%M %p'  # 12-часовой формат без секунд
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt).time()
                except ValueError:
                    continue

            try:
                return isoparse(value).time()
            except ValueError:
                pass

        # Пробуем преобразовать через pandas как последний вариант
        try:
            dt = pd.to_datetime(value, errors='raise')
            if isinstance(dt, pd.Timestamp):
                return dt.to_pydatetime().time()
            return dt.time()
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()

@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "DateTimeHandler"
])
class DateTimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "DateTimeTzHandler"
])
class DateTimeTzHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items() if m.get("handler") == "BooleanHandler"
])
class BooleanHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()
