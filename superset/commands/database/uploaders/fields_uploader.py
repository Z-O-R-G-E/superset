import logging
from datetime import timezone, time, datetime, date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import partial, lru_cache
from typing import Any, Optional, TypedDict, List, Dict, Type, Union
from abc import ABC, abstractmethod
import sqlalchemy as sa
from sqlalchemy.sql import select, func
import pandas as pd
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

# region Конфиги
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
# endregion


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
    datetime_format: Optional[str]
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
# endregion


# region Реализации
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

    def get_handler(self, type_name: str) -> Optional[Type[IFieldHandler]]:
        """Получить класс обработчика для типа"""

        return self._handlers.get(type_name.upper())

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""

        mapping = TYPE_MAPPING.get(type_name.upper(), {})
        return mapping.get("pandas", "string")

    def get_handler_name(self, type_name: str) -> Optional[str]:
        """Получить имя обработчика для типа"""

        mapping = TYPE_MAPPING.get(type_name.upper(), {})
        return mapping.get("handler")

    @lru_cache(maxsize=32)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Получить экземпляр обработчика для типа"""

        handler_class = self.get_handler(type_name)
        if not handler_class:
            return DefaultHandler()
        if type_name not in self._handler_instances:
            self._handler_instances[type_name] = handler_class()
        return self._handler_instances[type_name]


type_handler_registry = TypeHandlerRegistry()


class BaseFieldHandler(IFieldHandler):
    """Базовый класс обработчиков полей"""

    def __init__(self):
        self.null_values: set = set()

    def set_null_values(self, null_values: List[str]):
        """Установить значения, которые следует считать NULL"""

        self.null_values = set(null_values or [])

    def is_null(self, value: Any, is_real_string: Optional[bool] = False) -> bool:
        """Проверить, является ли значение NULL"""

        if value is None:
            return True
        if isinstance(value, str):
            value = value.strip()
            if is_real_string:
                return "\"\"" in self.null_values
            else:
                return not value or value.upper() == "NULL" or value in self.null_values
        return value in self.null_values


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
    """Оптимизированный конвертер полей в DataFrame"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def _validate_fields(self, fields: List[Dict[str, Any]]) -> None:
        """Валидация входных полей"""

        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))
        if not all(isinstance(field, dict) for field in fields):
            raise DatabaseUploadFailed(_("Все поля должны быть словарями"))

    def convert_to_dataframe(
        self,
        fields: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> pd.DataFrame:
        """Преобразовать поля в DataFrame с оптимизированной обработкой"""

        self._validate_fields(fields)

        try:
            data: Dict[str, List[Any]] = {}
            dtypes: Dict[str, Any] = {}
            null_values = set(options.get("null_values", []))

            for field in fields:
                name = field.get("name")
                if not name or not isinstance(name, str):
                    continue

                field_type = (field.get("type", "") or "").upper().strip()
                handler = self.type_handler_registry.get_handler_instance(field_type)
                if isinstance(handler, BaseFieldHandler):
                    handler.set_null_values(options.get("null_values", []))

                try:
                    value = field.get("value")
                    if value in null_values:
                        value = None
                    else:
                        value = handler.handle(field, options)

                    data[name] = [value]
                    dtypes[name] = self._get_pandas_dtype(field_type)
                except Exception as ex:
                    raise DatabaseUploadFailed(
                        _("Ошибка преобразования поля %(name)s: %(error)s",
                          name=name, error=str(ex)))

            if not data:
                raise DatabaseUploadFailed(_("Нет допустимых полей для загрузки"))

            df = pd.DataFrame(data)
            self._apply_dtypes(df, dtypes, null_values)
            self._process_index(df, options)

            return df

        except (pd.errors.ParserError, pd.errors.EmptyDataError) as ex:
            raise DatabaseUploadFailed(
                _("Ошибка парсинга данных: %(error)s", error=str(ex))
            ) from ex
        except Exception as ex:
            logger.exception("Ошибка создания DataFrame из полей")
            raise DatabaseUploadFailed(
                _("Не удалось создать DataFrame из полей")) from ex

    def _get_pandas_dtype(self, field_type: str) -> str:
        """Определить тип pandas на основе типа поля"""

        return self.type_handler_registry.get_pandas_type(field_type)

    def _apply_dtypes(
        self,
        df: pd.DataFrame,
        dtypes: Dict[str, Any],
        null_values: set
    ) -> None:
        """Применить типы данных к DataFrame"""

        for col, dtype in dtypes.items():
            try:
                if dtype == "object":
                    mask = ~df[col].isin(null_values) & df[col].notna()
                    df[col] = df[col].astype(str)
                    df.loc[mask, col] = df.loc[mask, col].map(Decimal)
                    df.loc[~mask, col] = None
                else:
                    if null_values:
                        df[col] = df[col].replace(null_values, None)
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
    """Оптимизированный загрузчик данных в БД с улучшенной безопасностью"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

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

    def _get_row_count(self, database: Database, table_name: str,
                       schema_name: Optional[str]) -> int:
        try:
            with database.get_sqla_engine() as engine:
                with engine.connect() as conn:
                    if schema_name:
                        query = select(func.count()).select_from(
                            sa.table(
                                table_name,
                                schema=schema_name,
                            )
                        )
                    else:
                        query = select(func.count()).select_from(
                            sa.table(table_name)
                        )
                    result = conn.execute(query)
                    return result.scalar() or 0
        except Exception as e:
            logger.warning(
                "Не удалось получить количество строк из таблицы %s: %s",
                f"{schema_name}.{table_name}" if schema_name else table_name,
                str(e)
            )
            return 0

    def load_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> None:
        """Загрузить DataFrame в базу данных с учетом особенностей СУБД"""

        try:
            self._validate_input(df, database, table_name)

            dtype = self._get_column_types(df, fields_metadata)
            self._preprocess_dataframe(df, options)

            to_sql_kwargs = self._prepare_to_sql_kwargs(
                df, options, dtype, table_name, schema_name, database)

            self._execute_dataframe_upload(
                database, table_name, schema_name, df, to_sql_kwargs)

        except Exception as ex:
            logger.exception("Не удалось загрузить DataFrame в базу данных")
            raise DatabaseUploadFailed(exception=ex) from ex

    def _validate_input(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str
    ) -> None:
        """Проверить входные параметры"""

        if df.empty:
            raise DatabaseUploadFailed(_("Невозможно загрузить пустой DataFrame"))
        if not table_name or not isinstance(table_name, str):
            raise DatabaseUploadFailed(_("Неверное имя таблицы"))
        if not database:
            raise DatabaseUploadFailed(_("База данных не указана"))

    def _preprocess_dataframe(
        self,
        df: pd.DataFrame,
        options: Dict[str, Any]
    ) -> None:
        """Предварительная обработка DataFrame"""

        null_values = options.get("null_values", [])
        if null_values:
            df.replace(null_values, None, inplace=True)

    def _prepare_to_sql_kwargs(
        self,
        df: pd.DataFrame,
        options: Dict[str, Any],
        dtype: Dict[str, sa.types.TypeEngine],
        table_name: str,
        schema_name: Optional[str],
        database: Database
    ) -> Dict[str, Any]:
        """Подготовить параметры для метода to_sql"""

        index_col = options.get("index_column")
        use_index = options.get("dataframe_index", False)
        already_exists = options.get("already_exists", "fail")
        index_label = options.get("index_label")

        kwargs = {
            "chunksize": READ_CHUNK_SIZE,
            "if_exists": already_exists,
            "index": use_index,
            "dtype": dtype,
            "method": None
        }

        if use_index:
            self._handle_index(df, options, kwargs, table_name, schema_name, database)

        return kwargs


    def _handle_index(
        self,
        df: pd.DataFrame,
        options: Dict[str, Any],
        to_sql_kwargs: Dict[str, Any],
        table_name: str,
        schema_name: Optional[str],
        database: Database
    ) -> None:
        """Обработать индекс DataFrame"""

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

            if final_index_label:
                to_sql_kwargs["index_label"] = final_index_label

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
    """Универсальный читатель полей с улучшенной обработкой ошибок"""

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

    def fields_metadata(self, fields: List[Dict[str, Any]]) -> FieldsMetadata:
        """Генерация метаданных полей с обработкой ошибок"""

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
        except Exception as ex:
            logger.warning("Ошибка генерации метаданных полей: %s", str(ex))
            return {"items": []}


class FieldsUploadCommand(BaseCommand):
    """Команда загрузки полей с улучшенной валидацией"""

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
            self._create_or_update_sqla_table()
        except Exception as ex:
            logger.exception("Ошибка загрузки полей в базу данных")
            raise

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

# region Общие обработчики типов
@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "IntegerHandler"
])
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "FloatHandler"
])
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "DecimalHandler"
])
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
                    logger.warning(
                        "Число %s превышает максимальную точность %d",
                        decimal_value, precision
                    )
                    return None

            if scale >= 0:
                return decimal_value.quantize(
                    Decimal('0.' + '0' * scale),
                    rounding=ROUND_HALF_UP
                )
            return decimal_value
        except (ValueError, InvalidOperation, TypeError) as e:
            logger.warning(
                "Ошибка преобразования Decimal: %s. Значение: %s",
                str(e), str(value)[:100]
            )
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)
        return sa.Numeric(precision=precision, scale=scale)

@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "StringHandler"
])
class StringHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value,True):
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "DateHandler"
])
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "TimeHandler"
])
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "DateTimeHandler"
])
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


@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "DateTimeTzHandler"
])
class DateTimeTzHandler(BaseFieldHandler):
    def handle(self, field: Dict[str, Any], options: Dict[str, Any]) -> Any:
        value = field.get("value")
        if self.is_null(value):
            return None

        try:
            if isinstance(value, datetime):
                if value.tzinfo is not None:
                    return value.astimezone(timezone.utc)
                return value.replace(tzinfo=timezone.utc)

            if isinstance(value, str):
                try:
                    dt = isoparse(value)
                except ValueError:
                    dt = pd.to_datetime(value, errors='raise')

                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)

            dt = pd.to_datetime(value, errors='coerce')
            if pd.isna(dt):
                return None

            dt = dt.to_pydatetime() if isinstance(dt, pd.Timestamp) else dt
            return dt.replace(
                tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(
                timezone.utc)

        except Exception as ex:
            logger.warning(
                "Ошибка при парсинге TIMESTAMPTZ: %s — %s",
                str(value)[:100], str(ex)
            )
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)

@type_handler_registry.register([
    t for t, m in TYPE_MAPPING.items()
    if m.get("handler") == "BooleanHandler"
])
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
# endregion
