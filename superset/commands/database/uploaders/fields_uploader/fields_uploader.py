import logging
from datetime import timezone, time, datetime
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
    DatabaseUploadFailed,
    DatabaseUploadSaveMetadataFailed,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.utils.core import get_user
from superset.utils.decorators import on_error, transaction

logger = logging.getLogger(__name__)

# Константы
READ_CHUNK_SIZE = 1000
MAX_DECIMAL_PRECISION = 38
MAX_STRING_LENGTH = 65535

# Базовые маппинги типов
BASE_TYPE_MAPPING = {
    "integer": {"pandas": "Int64", "handler": "IntegerHandler"},
    "float": {"pandas": "float64", "handler": "FloatHandler"},
    "decimal": {"pandas": "object", "handler": "DecimalHandler"},
    "string": {"pandas": "string", "handler": "StringHandler"},
    "date": {"pandas": "datetime64[ns]", "handler": "DateHandler"},
    "datetime": {"pandas": "datetime64[ns]", "handler": "DateTimeHandler"},
    "boolean": {"pandas": "boolean", "handler": "BooleanHandler"},
}

DBMS_CONFIG = {
    "postgresql": {
        "integer": "BIGINT",
        "float": "DOUBLE PRECISION",
        "decimal": "NUMERIC",
        "string": "TEXT",
        "date": "DATE",
        "datetime": "TIMESTAMP",
        "boolean": "BOOLEAN"
    },
    "clickhouse": {
        "integer": "Int64",
        "float": "Float64",
        "decimal": "Decimal(38, 6)",
        "string": "String",
        "date": "Date",
        "datetime": "DateTime",
        "boolean": "UInt8"
    }
}

# Автоматическое заполнение TYPE_MAPPING
TYPE_MAPPING = {}
for dbms, types in DBMS_CONFIG.items():
    for type_name, db_type in types.items():
        base_type = BASE_TYPE_MAPPING.get(type_name)
        if base_type and db_type not in TYPE_MAPPING:
            TYPE_MAPPING[db_type.split('(')[0].upper()] = base_type

# Дополнительные специфичные типы
EXTRA_TYPE_MAPPING = {
    "TINYINT": BASE_TYPE_MAPPING["integer"],
    "SMALLINT": BASE_TYPE_MAPPING["integer"],
    "INT": BASE_TYPE_MAPPING["integer"],
    "INTEGER": BASE_TYPE_MAPPING["integer"],
    "BIGINT": BASE_TYPE_MAPPING["integer"],
    "UINT8": BASE_TYPE_MAPPING["integer"],
    "Int64": BASE_TYPE_MAPPING["integer"],
    "FLOAT": BASE_TYPE_MAPPING["float"],
    "FLOAT32": BASE_TYPE_MAPPING["float"],
    "FLOAT64": BASE_TYPE_MAPPING["float"],
    "DOUBLE": BASE_TYPE_MAPPING["float"],
    "REAL": BASE_TYPE_MAPPING["float"],
    "BINARY_FLOAT": BASE_TYPE_MAPPING["float"],
    "BINARY_DOUBLE": BASE_TYPE_MAPPING["float"],
    "DECIMAL": BASE_TYPE_MAPPING["decimal"],
    "NUMERIC": BASE_TYPE_MAPPING["decimal"],
    "NUMBER": BASE_TYPE_MAPPING["decimal"],
    "BOOLEAN": BASE_TYPE_MAPPING["boolean"],
    "BIT": BASE_TYPE_MAPPING["boolean"],
    "BOOL": BASE_TYPE_MAPPING["boolean"],
    "UInt8": BASE_TYPE_MAPPING["boolean"],
    "DATE": BASE_TYPE_MAPPING["date"],
    "TIME": {"pandas": "object", "handler": "TimeHandler"},
    "DATETIME": BASE_TYPE_MAPPING["datetime"],
    "TIMESTAMP": BASE_TYPE_MAPPING["datetime"],
    "DATETIME64": BASE_TYPE_MAPPING["datetime"],
    "TIMESTAMPTZ": {"pandas": "datetime64[ns, UTC]", "handler": "DateTimeTzHandler"},
    "CHAR": BASE_TYPE_MAPPING["string"],
    "VARCHAR": BASE_TYPE_MAPPING["string"],
    "TEXT": BASE_TYPE_MAPPING["string"],
    "NCHAR": BASE_TYPE_MAPPING["string"],
    "NVARCHAR": BASE_TYPE_MAPPING["string"],
    "CLOB": BASE_TYPE_MAPPING["string"],
    "LONGTEXT": BASE_TYPE_MAPPING["string"],
    "FIXEDSTRING": BASE_TYPE_MAPPING["string"],
    "STRING": BASE_TYPE_MAPPING["string"],
}
TYPE_MAPPING.update(EXTRA_TYPE_MAPPING)

# Реестр обработчиков
HANDLER_TYPES = {}
for type_name, type_info in TYPE_MAPPING.items():
    handler_name = type_info.get("handler")
    if handler_name:
        HANDLER_TYPES.setdefault(handler_name, []).append(type_name)


# Типы для аннотаций
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
    dbms: str


class IDatabaseAdapter(ABC):
    """Абстрактный класс адаптера для работы с разными СУБД"""

    @abstractmethod
    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        """Создать таблицу в БД"""
        pass

    @abstractmethod
    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        """Вставить данные в таблицу"""
        pass

    @abstractmethod
    def table_exists(self, table_name: str) -> bool:
        """Проверить существование таблицы"""
        pass

    @abstractmethod
    def drop_table(self, table_name: str) -> None:
        """Удалить таблицу"""
        pass

    @abstractmethod
    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        """Получить типы колонок для данной СУБД"""
        pass


class PostgresqlAdapter(IDatabaseAdapter):
    """Адаптер для PostgreSQL"""

    def __init__(self, database: Database):
        self.database = database

    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'text').upper()
                db_type = DBMS_CONFIG['postgresql'].get(field_type.lower(), 'TEXT')
                columns.append(f"{name} {db_type}")

            create_sql = f"CREATE TABLE {table_name} ({', '.join(columns)})"
            with engine.connect() as conn:
                conn.execute(sa.text(create_sql))

    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        with self.database.get_sqla_engine() as engine:
            data.to_sql(
                table_name,
                engine,
                if_exists='append',
                index=False,
                chunksize=READ_CHUNK_SIZE
            )

    def table_exists(self, table_name: str) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(
                    sa.text(
                        f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table_name}')"
                    )
                )
                return result.scalar()

    def drop_table(self, table_name: str) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa.text(f"DROP TABLE IF EXISTS {table_name}"))

    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        return {
            field['name']: DBMS_CONFIG['postgresql'].get(field.get('type', '').lower(), 'TEXT')
            for field in fields
        }


class ClickhouseAdapter(IDatabaseAdapter):
    """Адаптер для ClickHouse"""

    def __init__(self, database: Database):
        self.database = database

    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'text').upper()
                db_type = DBMS_CONFIG['clickhouse'].get(field_type.lower(), 'String')
                columns.append(f"{name} {db_type}")

            create_sql = f"CREATE TABLE {table_name} ({', '.join(columns)}) ENGINE = MergeTree() ORDER BY tuple()"
            with engine.connect() as conn:
                conn.execute(sa.text(create_sql))

    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(sa.text(f"DESCRIBE TABLE {table_name}"))
                table_columns = [row[0] for row in result]

                valid_columns = [col for col in data.columns if col in table_columns]
                if not valid_columns:
                    raise ValueError("Нет совпадающих столбцов между DataFrame и таблицей")

                data = data[valid_columns].to_dict('records')
                columns_sql = ", ".join(valid_columns)
                placeholders = ", ".join([f":{col}" for col in valid_columns])
                insert_sql = f"INSERT INTO {table_name} ({columns_sql}) VALUES ({placeholders})"

                conn.execute(sa.text(insert_sql), data)

    def table_exists(self, table_name: str) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(
                    sa.text(f"EXISTS TABLE {table_name}")
                )
                return result.scalar() == 1

    def drop_table(self, table_name: str) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa.text(f"DROP TABLE IF EXISTS {table_name}"))

    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        return {
            field['name']: DBMS_CONFIG['clickhouse'].get(field.get('type', '').lower(), 'String')
            for field in fields
        }


class DatabaseAdapterFactory:
    """Фабрика для создания адаптеров БД"""

    @staticmethod
    def create_adapter(dbms: str, database: Database) -> IDatabaseAdapter:
        if dbms == 'clickhouse':
            return ClickhouseAdapter(database)
        else:
            return PostgresqlAdapter(database)


# Базовые классы
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

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        """Получить DBMS-специфичный тип данных"""
        field_type = (field.get("type") or "").upper().strip()
        if field_type in TYPE_MAPPING:
            return field_type
        return DBMS_CONFIG.get(dbms, {}).get(self._infer_base_type(field), "TEXT")

    def _infer_base_type(self, field: Dict[str, Any]) -> str:
        """Определить базовый тип данных"""
        type_str = (field.get("type") or "").lower()
        if "int" in type_str:
            return "integer"
        elif "float" in type_str or "double" in type_str:
            return "float"
        elif "decimal" in type_str or "numeric" in type_str:
            return "decimal"
        elif "date" in type_str:
            return "date"
        elif "time" in type_str:
            return "datetime" if "timestamp" in type_str else "time"
        elif "bool" in type_str:
            return "boolean"
        return "string"


class BaseTypeHandler(IFieldHandler):
    """Базовый обработчик типов с общими методами"""

    def __init__(self, type_category: str):
        self.type_category = type_category

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = DBMS_CONFIG.get(dbms, {}).get(self.type_category, "TEXT")
        if dbms == "clickhouse" and self.type_category == "decimal":
            return "Decimal(38, 6)"
        return base_type


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


# Реализации классов
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

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("string", "TEXT")


class NullChecker:
    """Класс для централизованной проверки значений на null"""

    def __init__(self, null_values: List[str] = None):
        self.null_values = self._process_null_values(null_values or [])

    def _process_null_values(self, null_values: List[str]) -> set:
        """Обработать значения null"""
        processed = set()
        for val in null_values:
            processed.add("" if val == '""' else val.lower())
        return processed

    def is_null(self, value: Any, field_type: Optional[str] = None) -> bool:
        """Проверить, является ли значение NULL"""
        if value is None:
            return True

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return True
            if field_type and self._is_string_type(field_type):
                return value.lower() in self.null_values

        return str(value).lower() in self.null_values

    def _is_string_type(self, field_type: str) -> bool:
        """Проверить, является ли тип строковым"""
        type_info = TYPE_MAPPING.get(field_type.upper(), {})
        return type_info.get("handler") == "StringHandler"

    def process_value(self, value: Any, field_type: Optional[str] = None) -> Any:
        """Обработать значение"""
        if self.is_null(value, field_type):
            return None

        if field_type and self._is_string_type(field_type):
            if isinstance(value, str):
                return value.strip()
            return str(value)

        return value


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
        data, dtypes = self._process_fields(fields, null_checker)

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

    def _process_fields(
            self,
            fields: List[Dict[str, Any]],
            null_checker: NullChecker
    ) -> tuple[Dict[str, List[Any]], Dict[str, str]]:
        """Обработать поля и преобразовать в данные"""
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
        return data, dtypes

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
        use_index = options.get("dataframe_index", False)
        index_label = options.get("index_label")
        already_exists = options.get("already_exists", "fail")

        if isinstance(index_label, str) and index_label.lower() == "undefined":
            index_label = None

        if not use_index:
            if index_col and index_col in df.columns:
                df.set_index(index_col, inplace=True)
                if index_label:
                    df.index.name = index_label
            return

        final_index_label = (
            index_label if index_label and index_label != '' else
            index_col if index_col and index_col != '' else
            "id"
        )

        if not index_col or index_col == '':
            offset = self._get_existing_rows_count(
                options) if already_exists == "append" else 0
            df.index = pd.RangeIndex(start=offset, stop=offset + len(df))
            df.index.name = final_index_label
        else:
            if index_col in df.columns:
                df.set_index(index_col, inplace=True)
                df.index.name = final_index_label if final_index_label else index_col

        if final_index_label:
            options["index_label"] = final_index_label

    def _get_existing_rows_count(self, options: Dict[str, Any]) -> int:
        """Получить количество строк в существующей таблице"""
        table_fullname = (
            f"{options['schema_name']}.{options['table_name']}"
            if options.get('schema_name')
            else options['table_name']
        )
        try:
            with options['database'].get_sqla_engine() as engine:
                with engine.connect() as conn:
                    result = conn.execute(
                        sa.text(f"SELECT COUNT(*) FROM {table_fullname}"))
                    return result.scalar() or 0
        except Exception as e:
            logger.warning(
                "Не удалось получить количество строк из таблицы %s: %s",
                table_fullname, str(e))
            return 0


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

        dbms = options.get("dbms", "postgresql")
        adapter = DatabaseAdapterFactory.create_adapter(dbms, database)

        try:
            already_exists = options.get("already_exists", "fail")
            full_table_name = f"{schema_name}.{table_name}" if schema_name else table_name

            if already_exists == "replace" and adapter.table_exists(full_table_name):
                adapter.drop_table(full_table_name)

            if not adapter.table_exists(full_table_name) or already_exists == "replace":
                adapter.create_table(full_table_name, fields_metadata)

            adapter.insert_data(full_table_name, df)

        except Exception as e:
            logger.error(f"Ошибка при загрузке данных: {str(e)}")
            raise DatabaseUploadFailed(
                _("Ошибка загрузки данных: %(error)s", error=str(e)))

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
                if schema_name not in inspect(engine).get_schema_names():
                    raise DatabaseUploadFailed(
                        _("Схема '%(schema_name)s' не найдена в базе данных",
                          schema_name=schema_name))
        except Exception as ex:
            logger.exception("Ошибка при проверке существования схемы")
            raise DatabaseUploadFailed(
                _("Не удалось проверить существование схемы")) from ex


class FieldsReader:
    """Прочитать поля"""

    DBMS_MAPPING = {
        'postgresql': ['postgresql', 'postgres'],
        'mysql': ['mysql'],
        'sqlite': ['sqlite'],
        'oracle': ['oracle'],
        'mssql': ['mssql', 'sqlserver'],
        'clickhouse': ['clickhouse']
    }

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
        self._options.update({
            "database": database,
            "table_name": table_name,
            "schema_name": schema_name,
            "dbms": self._get_dbms_type(database),
        })

        df = self._dataframe_converter.convert_to_dataframe(fields, self._options)
        self._database_loader.load_to_database(
            df, database, table_name, schema_name, fields, self._options)

    def _get_dbms_type(self, database: Database) -> str:
        """Определить тип DBMS из соединения с базой данных"""
        if not database:
            return "postgresql"

        engine_url = str(database.sqlalchemy_uri).lower()
        for dbms, keywords in self.DBMS_MAPPING.items():
            if any(keyword in engine_url for keyword in keywords):
                return dbms
        return "postgresql"

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
            dbms: str,
            table_name: str,
            upload_fields: Any,
            schema: Optional[str],
            reader: FieldsReader,
    ) -> None:
        self._model_id = model_id
        self._dbms = dbms
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

        if not isinstance(self._fields, list) or not self._fields:
            raise DatabaseUploadFailed(message=_("Не указано полей для загрузки"))


@type_handler_registry.register(HANDLER_TYPES["IntegerHandler"])
class IntegerHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("integer", "BIGINT")


@type_handler_registry.register(HANDLER_TYPES["FloatHandler"])
class FloatHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return float(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("float", "DOUBLE")


@type_handler_registry.register(HANDLER_TYPES["DecimalHandler"])
class DecimalHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        str_value = str(value).strip().replace(" ", "").replace(",", "")
        decimal_value = Decimal(str_value)

        scale = 4
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

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = DBMS_CONFIG.get(dbms, {}).get("decimal", "NUMERIC")
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)

        if dbms == "oracle":
            return f"NUMBER({precision},{scale})"
        elif dbms == "mssql":
            return f"DECIMAL({precision},{scale})"
        elif dbms == "mysql":
            return f"DECIMAL({precision},{scale})"
        return base_type


@type_handler_registry.register(HANDLER_TYPES["StringHandler"])
class StringHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        if size:
            return sa.VARCHAR(size)
        return sa.Text()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        size = field.get("size")
        base_type = DBMS_CONFIG.get(dbms, {}).get("string", "TEXT")

        if size and dbms in ["postgresql", "mysql", "oracle", "mssql"]:
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "mysql":
                return f"VARCHAR({size})"
            elif dbms == "oracle":
                return f"VARCHAR2({size})"
            elif dbms == "mssql":
                return f"NVARCHAR({size})"
        return base_type


@type_handler_registry.register(HANDLER_TYPES["DateHandler"])
class DateHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("date", "DATE")


@type_handler_registry.register(HANDLER_TYPES["TimeHandler"])
class TimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, time):
            return value

        if isinstance(value, datetime):
            return value.time()

        if isinstance(value, str):
            formats = [
                '%H:%M:%S.%f',
                '%H:%M:%S',
                '%H:%M',
                '%I:%M:%S %p',
                '%I:%M %p'
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

        try:
            dt = pd.to_datetime(value, errors='raise')
            if isinstance(dt, pd.Timestamp):
                return dt.to_pydatetime().time()
            return dt.time()
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("time", "TIME")


@type_handler_registry.register(HANDLER_TYPES["DateTimeHandler"])
class DateTimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("datetime", "TIMESTAMP")


@type_handler_registry.register(HANDLER_TYPES["DateTimeTzHandler"])
class DateTimeTzHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        if dbms == "postgresql":
            return "TIMESTAMP WITH TIME ZONE"
        elif dbms == "oracle":
            return "TIMESTAMP WITH TIME ZONE"
        return DBMS_CONFIG.get(dbms, {}).get("datetime", "TIMESTAMP")


@type_handler_registry.register(HANDLER_TYPES["BooleanHandler"])
class BooleanHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("boolean", "BOOLEAN")
