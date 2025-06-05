import logging
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Type, Union

import pandas as pd
from flask_babel import lazy_gettext as _
from sqlalchemy.exc import SQLAlchemyError

from superset import db
from superset.commands.base import BaseCommand
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseSchemaUploadNotAllowed,
    DatabaseUploadFailed,
    DatabaseUploadNotSupported,
    DatabaseUploadSaveMetadataFailed,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.sql_parse import Table
from superset.utils.core import get_user
from superset.utils.decorators import transaction
from superset.views.database.validators import schema_allows_file_upload

logger = logging.getLogger(__name__)


class AlreadyExistsBehavior(Enum):
    """Поведение при существовании таблицы"""
    FAIL = "fail"
    REPLACE = "replace"
    APPEND = "append"


class TypeHandler(ABC):
    """Абстрактный базовый класс для обработчиков типов"""

    @classmethod
    @abstractmethod
    def handles(cls) -> List[str]:
        """Возвращает список поддерживаемых типов"""
        pass

    @classmethod
    @abstractmethod
    def convert(cls, value: Any) -> Any:
        """Конвертирует значение в нужный тип"""
        pass

    @classmethod
    @abstractmethod
    def pandas_type(cls) -> str:
        """Возвращает соответствующий тип pandas"""
        pass


class IntegerHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['TINYINT', 'SMALLINT', 'INT', 'INTEGER']

    @classmethod
    def convert(cls, value: Any) -> int:
        if pd.isna(value):
            return 0
        return int(float(value)) if isinstance(value, str) else int(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'Int32'


class BigIntegerHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['BIGINT', 'UINT8']

    @classmethod
    def convert(cls, value: Any) -> int:
        if pd.isna(value):
            return 0
        return int(float(value)) if isinstance(value, str) else int(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'Int64'


class FloatHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['FLOAT', 'FLOAT32', 'REAL', 'BINARY_FLOAT']

    @classmethod
    def convert(cls, value: Any) -> float:
        if pd.isna(value):
            return float('nan')
        return float(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'float32'


class DoubleHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['FLOAT64', 'DOUBLE', 'BINARY_DOUBLE']

    @classmethod
    def convert(cls, value: Any) -> float:
        if pd.isna(value):
            return float('nan')
        return float(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'float64'


class DecimalHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DECIMAL', 'NUMERIC', 'NUMBER']

    @classmethod
    def convert(cls, value: Any) -> Optional[Decimal]:
        if pd.isna(value):
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None

    @classmethod
    def pandas_type(cls) -> str:
        return 'object'


class StringHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return [
            'CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR',
            'CLOB', 'LONGTEXT', 'FIXEDSTRING', 'STRING',
            'LowCardinality(String)'
        ]

    @classmethod
    def convert(cls, value: Any) -> Optional[str]:
        if pd.isna(value):
            return None
        return str(value) if value is not None else None

    @classmethod
    def pandas_type(cls) -> str:
        return 'string'


class BooleanHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['BOOLEAN', 'BIT', 'BOOL']

    @classmethod
    def convert(cls, value: Any) -> Optional[bool]:
        if pd.isna(value):
            return None
        if isinstance(value, str):
            return value.lower() in ('true', '1', 't', 'y', 'yes')
        return bool(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'boolean'


class DateHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DATE']

    @classmethod
    def convert(cls, value: Any) -> Optional[date]:
        if pd.isna(value):
            return None
        if isinstance(value, (date, datetime)):
            return value.date()
        try:
            return pd.to_datetime(value).date()
        except Exception:
            return None

    @classmethod
    def pandas_type(cls) -> str:
        return 'datetime64[ns]'


class DateTimeHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DATETIME', 'TIMESTAMP', 'DATETIME64', 'TIMESTAMPTZ']

    @classmethod
    def convert(cls, value: Any) -> Optional[datetime]:
        if pd.isna(value):
            return None
        try:
            return pd.to_datetime(value)
        except Exception:
            return None

    @classmethod
    def pandas_type(cls) -> str:
        return 'datetime64[ns]'


class TypeHandlerFactory:
    """Фабрика для получения обработчиков типов"""
    _handlers: List[Type[TypeHandler]] = [
        IntegerHandler,
        BigIntegerHandler,
        FloatHandler,
        DoubleHandler,
        DecimalHandler,
        StringHandler,
        BooleanHandler,
        DateHandler,
        DateTimeHandler,
    ]

    @classmethod
    def get_handler(cls, field_type: str) -> Type[TypeHandler]:
        field_type = field_type.upper().strip()
        for handler in cls._handlers:
            if field_type in handler.handles():
                return handler
        logger.warning(
            f"Не найден обработчик для типа {field_type}, используется StringHandler")
        return StringHandler


class FieldDefinitionValidator:
    """Валидатор определений полей"""

    @staticmethod
    def validate(field: Dict[str, Any], index: int) -> None:
        if not isinstance(field, dict):
            raise ValueError(f"Поле #{index + 1} должно быть словарем")

        required_keys = {'name', 'type'}
        missing_keys = required_keys - field.keys()
        if missing_keys:
            raise ValueError(
                f"Поле #{index + 1} ({field.get('name', 'unnamed')}) "
                f"отсутствуют обязательные ключи: {', '.join(missing_keys)}"
            )

        if not isinstance(field['name'], str) or not field['name'].strip():
            raise ValueError(f"Поле #{index + 1} имеет недопустимое имя")

        if not isinstance(field['type'], str) or not field['type'].strip():
            raise ValueError(f"Поле #{index + 1} имеет недопустимый тип")

        for attr in ['size', 'precision', 'scale']:
            if attr in field and field[attr] is not None:
                if not isinstance(field[attr], (int, float)) or field[attr] < 0:
                    raise ValueError(
                        f"Поле #{index + 1} имеет недопустимое значение {attr}"
                    )

        if 'setEnum' in field and field['setEnum'] is not None:
            if not isinstance(field['setEnum'], list):
                raise ValueError(f"Поле #{index + 1} setEnum должно быть списком")
            for enum_value in field['setEnum']:
                if not isinstance(enum_value, str):
                    raise ValueError(
                        f"Поле #{index + 1} setEnum содержит не строковые значения"
                    )


class FieldsToDataFrameConverter:
    """Конвертер полей в DataFrame"""

    def __init__(self, day_first: bool = False,
                 null_values: Optional[List[str]] = None):
        self._day_first = day_first
        self._null_values = null_values or ['NULL', 'null', '', 'None', 'none']

    def _convert_value(self, value: Any, handler_class: Type[TypeHandler]) -> Any:
        if value is None:
            return None

        if isinstance(value, str) and value.strip() in self._null_values:
            return None

        try:
            return handler_class.convert(value)
        except Exception as ex:
            logger.warning(f"Ошибка преобразования значения {value}: {str(ex)}")
            return value

    def convert(self, fields: List[Dict[str, Any]]) -> pd.DataFrame:
        data: Dict[str, List[Any]] = {}

        for field in fields:
            field_name = field['name']
            handler_class = TypeHandlerFactory.get_handler(field['type'])
            value = field.get('value')
            data[field_name] = [self._convert_value(value, handler_class)]

        df = pd.DataFrame(data)

        for field in fields:
            field_name = field['name']
            if field_name not in df.columns:
                continue

            handler_class = TypeHandlerFactory.get_handler(field['type'])
            pandas_type = handler_class.pandas_type()

            try:
                if pandas_type != 'object':
                    df[field_name] = df[field_name].astype(pandas_type)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"Ошибка преобразования столбца {field_name} "
                    f"к типу {pandas_type}: {str(e)}"
                )

        return df


class FieldsUploader:
    """Загрузчик полей в базу данных"""

    def __init__(
        self,
        already_exists: str = AlreadyExistsBehavior.FAIL.value,
        index_column: Optional[str] = None,
        dataframe_index: bool = False,
        index_label: Optional[str] = None,
        day_first: bool = False,
        null_values: Optional[List[str]] = None,
    ):
        self._already_exists = already_exists
        self._index_column = index_column
        self._dataframe_index = dataframe_index
        self._index_label = index_label
        self._day_first = day_first
        self._null_values = null_values or []
        self._converter = FieldsToDataFrameConverter(day_first, null_values)

    def upload(
        self,
        fields: List[Dict[str, Any]],
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        df = self._converter.convert(fields)
        self._dataframe_to_database(df, database, table_name, schema_name)

    def _dataframe_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        try:
            data_table = Table(table=table_name, schema=schema_name)

            if self._index_column and self._index_column in df.columns:
                df.set_index(
                    self._index_column,
                    drop=not self._dataframe_index,
                    inplace=True
                )
                if self._index_label:
                    df.index.name = self._index_label

            to_sql_kwargs = {
                "chunksize": 1000,
                "if_exists": self._already_exists,
                "index": self._dataframe_index,
                "method": "multi",
            }

            if self._index_label and self._dataframe_index:
                to_sql_kwargs["index_label"] = self._index_label

            database.db_engine_spec.df_to_sql(
                database,
                data_table,
                df,
                to_sql_kwargs=to_sql_kwargs,
            )
        except Exception as ex:
            logger.exception("Ошибка загрузки в базу данных")
            raise DatabaseUploadFailed(
                _("Ошибка загрузки в базу данных: %(error)s", error=str(ex))
            ) from ex


class UploadFieldsCommand(BaseCommand):
    """Команда загрузки полей в таблицу БД"""

    def __init__(
        self,
        model_id: int,
        table_name: str,
        schema: Optional[str],
        already_exists: str,
        upload_fields: List[Dict[str, Any]],
        index_column: Optional[str] = None,
        dataframe_index: bool = False,
        index_label: Optional[str] = None,
        day_first: bool = False,
        null_values: Optional[List[str]] = None,
    ) -> None:
        self._model_id = model_id
        self._model = None
        self._table_name = table_name
        self._schema = schema
        self._upload_fields = upload_fields
        self._null_values = null_values or ['NULL', 'null', '']

        self._uploader = FieldsUploader(
            already_exists=already_exists,
            index_column=index_column,
            dataframe_index=dataframe_index,
            index_label=index_label,
            day_first=day_first,
            null_values=null_values,
        )

    @transaction
    def run(self) -> None:
        self.validate()

        if not self._model:
            raise DatabaseNotFoundError()

        try:
            self._uploader.upload(
                self._upload_fields,
                self._model,
                self._table_name,
                self._schema,
            )
            self._update_table_metadata()
        except Exception as ex:
            logger.exception("Ошибка загрузки полей")
            raise DatabaseUploadFailed(
                _("Ошибка загрузки полей: %(error)s", error=str(ex))
            ) from ex

    def _update_table_metadata(self) -> None:
        try:
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

            sqla_table.fetch_metadata()
            db.session.commit()
        except SQLAlchemyError as ex:
            db.session.rollback()
            logger.warning(f"Ошибка обновления метаданных: {str(ex)}")
            raise DatabaseUploadSaveMetadataFailed() from ex
        except Exception as ex:
            db.session.rollback()
            logger.warning(f"Неожиданная ошибка обновления метаданных: {str(ex)}")
            raise DatabaseUploadSaveMetadataFailed() from ex

    def validate(self) -> None:
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()

        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()

        if not self._model.db_engine_spec.supports_file_upload:
            raise DatabaseUploadNotSupported()

        if self._uploader._already_exists not in [e.value for e in
                                                  AlreadyExistsBehavior]:
            raise ValueError(
                f"Недопустимое значение already_exists: {self._uploader._already_exists}. "
                f"Допустимые значения: {[e.value for e in AlreadyExistsBehavior]}"
            )

        if not isinstance(self._upload_fields, list):
            raise ValueError("uploadFields должен быть списком")

        if len(self._upload_fields) == 0:
            raise ValueError("Список uploadFields не может быть пустым")

        seen_names = set()
        for i, field in enumerate(self._upload_fields):
            if not isinstance(field, dict):
                raise ValueError(f"Элемент {i} должен быть словарем")

            FieldDefinitionValidator.validate(field, i)

            field_name = field['name']
            if field_name in seen_names:
                raise ValueError(f"Дублирующееся имя поля: {field_name}")
            seen_names.add(field_name)

        if self._uploader._index_column:
            if not isinstance(self._uploader._index_column, str):
                raise ValueError("indexColumn должен быть строкой")

            if self._uploader._index_column not in seen_names:
                raise ValueError(
                    f"Столбец индекса '{self._uploader._index_column}' "
                    "не найден в uploadFields"
                )

        if self._null_values is not None:
            if not isinstance(self._null_values, list):
                raise ValueError("nullValues должен быть списком строк")

            for value in self._null_values:
                if not isinstance(value, str):
                    raise ValueError("Все значения nullValues должны быть строками")

    def __repr__(self) -> str:
        return (
            f"<UploadFieldsCommand model_id={self._model_id}, "
            f"table={self._schema}.{self._table_name}, "
            f"fields={len(self._upload_fields)}>"
        )
