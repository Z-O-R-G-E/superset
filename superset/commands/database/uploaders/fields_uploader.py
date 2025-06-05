import logging
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Type

import pandas as pd
from flask_babel import lazy_gettext as _

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


class TypeHandler(ABC):
    """Абстрактный базовый класс для обработчиков типов"""

    @classmethod
    @abstractmethod
    def handles(cls) -> List[str]:
        """Возвращает список типов, которые обрабатывает этот обработчик"""
        pass

    @classmethod
    @abstractmethod
    def convert(cls, value: Any) -> Any:
        """Конвертирует значение в соответствующий тип"""
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
        return int(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'int32'


class BigIntegerHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['BIGINT', 'UINT8']

    @classmethod
    def convert(cls, value: Any) -> int:
        return int(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'int64'


class FloatHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['FLOAT', 'FLOAT32', 'REAL', 'BINARY_FLOAT']

    @classmethod
    def convert(cls, value: Any) -> float:
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
        return float(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'float64'


class DecimalHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DECIMAL', 'NUMERIC', 'NUMBER']

    @classmethod
    def convert(cls, value: Any) -> Decimal:
        return Decimal(str(value))

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
    def convert(cls, value: Any) -> str:
        return str(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'object'


class BooleanHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['BOOLEAN', 'BIT', 'BOOL']

    @classmethod
    def convert(cls, value: Any) -> bool:
        if isinstance(value, str):
            return value.lower() in ('true', '1', 't', 'y', 'yes')
        return bool(value)

    @classmethod
    def pandas_type(cls) -> str:
        return 'bool'


class DateHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DATE']

    @classmethod
    def convert(cls, value: Any) -> date:
        if isinstance(value, (date, datetime)):
            return value.date()
        return pd.to_datetime(value).date()

    @classmethod
    def pandas_type(cls) -> str:
        return 'datetime64[ns]'


class DateTimeHandler(TypeHandler):
    @classmethod
    def handles(cls) -> List[str]:
        return ['DATETIME', 'TIMESTAMP', 'DATETIME64', 'TIMESTAMPTZ']

    @classmethod
    def convert(cls, value: Any) -> datetime:
        return pd.to_datetime(value)

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
        field_type = field_type.upper()
        for handler in cls._handlers:
            if field_type in handler.handles():
                return handler
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
                f"не содержит обязательных ключей: {', '.join(missing_keys)}"
            )


class FieldsToDataFrameConverter:
    """Конвертер определений полей в DataFrame"""

    def __init__(self, day_first: bool = False):
        self._day_first = day_first

    def convert(self, fields: List[Dict[str, Any]]) -> pd.DataFrame:
        data: Dict[str, List[Any]] = {}

        for field in fields:
            field_name = field['name']
            field_type = field['type']
            handler_class = TypeHandlerFactory.get_handler(field_type)

            value = field.get('value')
            converted_value = None

            if value is not None:
                try:
                    converted_value = handler_class.convert(value)
                except Exception as ex:
                    logger.warning(
                        f"Не удалось преобразовать значение для поля {field_name}: {str(ex)}"
                    )
                    converted_value = value

            data[field_name] = [converted_value]

        df = pd.DataFrame(data)

        for field in fields:
            field_name = field['name']
            handler_class = TypeHandlerFactory.get_handler(field['type'])
            pandas_type = handler_class.pandas_type()

            if field_name in df.columns and pandas_type != 'object':
                try:
                    df[field_name] = df[field_name].astype(pandas_type)
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Не удалось преобразовать столбец {field_name} "
                        f"к типу {pandas_type}: {str(e)}"
                    )

        return df


class FieldsUploader:
    """Класс для загрузки данных из полей в базу данных"""

    def __init__(
            self,
            already_exists: str = "fail",
            index_column: Optional[str] = None,
            dataframe_index: bool = False,
            index_label: Optional[str] = None,
            day_first: bool = False,
    ):
        self._already_exists = already_exists
        self._index_column = index_column
        self._dataframe_index = dataframe_index
        self._index_label = index_label
        self._day_first = day_first
        self._converter = FieldsToDataFrameConverter(day_first)

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
            logger.exception("Ошибка загрузки данных в базу")
            raise DatabaseUploadFailed(
                _("Ошибка загрузки данных в базу: %(error)s", error=str(ex))
            ) from ex


class UploadFieldsCommand(BaseCommand):
    """Команда для загрузки определений полей в таблицу БД"""

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
    ) -> None:
        self._model_id = model_id
        self._model = None
        self._table_name = table_name
        self._schema = schema
        self._upload_fields = upload_fields

        self._uploader = FieldsUploader(
            already_exists=already_exists,
            index_column=index_column,
            dataframe_index=dataframe_index,
            index_label=index_label,
            day_first=day_first,
        )

    @transaction
    def run(self) -> None:
        """Выполнение загрузки полей в таблицу"""
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
            logger.exception("Ошибка при загрузке полей")
            raise DatabaseUploadFailed(
                _("Ошибка при загрузке полей: %(error)s", error=str(ex))
            ) from ex

    def _update_table_metadata(self) -> None:
        """Обновление метаданных таблицы в Superset"""
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
            logger.warning(f"Не удалось обновить метаданные: {str(ex)}")
            raise DatabaseUploadSaveMetadataFailed() from ex

    def validate(self) -> None:
        """Валидация параметров перед выполнением"""
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()

        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()

        if not self._model.db_engine_spec.supports_file_upload:
            raise DatabaseUploadNotSupported()

        if self._uploader._already_exists not in ["append", "replace", "fail"]:
            raise ValueError(
                "Недопустимое значение already_exists. "
                "Допустимые значения: 'append', 'replace', 'fail'"
            )

        if not isinstance(self._upload_fields, list):
            raise ValueError("uploadFields должен быть списком словарей")

        if not self._upload_fields:
            raise ValueError("Не указаны поля для загрузки")

        for i, field in enumerate(self._upload_fields):
            FieldDefinitionValidator.validate(field, i)

        if self._uploader._index_column and self._uploader._index_column not in [
            f['name'] for f in self._upload_fields
        ]:
            raise ValueError(
                f"Столбец индекса '{self._uploader._index_column}' "
                "не найден в uploadFields"
            )

    def __repr__(self) -> str:
        return (
            f"<UploadFieldsCommand model_id={self._model_id}, "
            f"table={self._schema}.{self._table_name}, "
            f"fields={len(self._upload_fields)}>"
        )
