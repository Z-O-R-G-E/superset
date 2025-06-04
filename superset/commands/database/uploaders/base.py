# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
import logging
from abc import abstractmethod
from datetime import time, date, datetime
from functools import partial
from typing import Any, Optional, TypedDict, Dict, List

import pandas as pd
from flask_babel import lazy_gettext as _
from werkzeug.datastructures import FileStorage

from superset import db
from superset.commands.base import BaseCommand
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseSchemaUploadNotAllowed,
    DatabaseUploadFailed,
    DatabaseUploadNotSupported,
    DatabaseUploadSaveMetadataFailed,
)
from superset.commands.exceptions import CommandException
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.sql_parse import Table
from superset.utils.core import get_user
from superset.utils.decorators import on_error, transaction
from superset.views.database.validators import schema_allows_file_upload

logger = logging.getLogger(__name__)

READ_CHUNK_SIZE = 1000


class ReaderOptions(TypedDict, total=False):
    already_exists: str
    index_label: str
    dataframe_index: bool


class FileMetadataItem(TypedDict):
    sheet_name: Optional[str]
    column_names: list[str]


class FileMetadata(TypedDict, total=False):
    items: list[FileMetadataItem]


class BaseDataReader:
    """
    Base class for reading data from a file and uploading it to a database
    These child objects are used by the UploadCommand as a dependency injection
    to read data from multiple file types (e.g. CSV, Excel, etc.)
    """

    def __init__(self, options: Optional[dict[str, Any]] = None) -> None:
        self._options = options or {}

    @abstractmethod
    def file_to_dataframe(self, file: FileStorage) -> pd.DataFrame: ...

    @abstractmethod
    def file_metadata(self, file: FileStorage) -> FileMetadata: ...

    def read(
        self,
        file: FileStorage,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        self._dataframe_to_database(
            self.file_to_dataframe(file), database, table_name, schema_name
        )

    def _dataframe_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        """
        Upload DataFrame to database

        :param df:
        :throws DatabaseUploadFailed: if there is an error uploading the DataFrame
        """
        try:
            data_table = Table(table=table_name, schema=schema_name)
            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": self._options.get("already_exists", "fail"),
                "index": self._options.get("dataframe_index", False),
            }
            if self._options.get("index_label") and self._options.get(
                "dataframe_index"
            ):
                to_sql_kwargs["index_label"] = self._options.get("index_label")
            database.db_engine_spec.df_to_sql(
                database,
                data_table,
                df,
                to_sql_kwargs=to_sql_kwargs,
            )
        except ValueError as ex:
            raise DatabaseUploadFailed(
                message=_(
                    "Table already exists. You can change your "
                    "'if table already exists' strategy to append or "
                    "replace or provide a different Table Name to use."
                )
            ) from ex
        except Exception as ex:
            raise DatabaseUploadFailed(exception=ex) from ex


class UploadCommand(BaseCommand):
    def __init__(  # pylint: disable=too-many-arguments
        self,
        model_id: int,
        table_name: str,
        file: Any,
        schema: Optional[str],
        reader: BaseDataReader,
    ) -> None:
        self._model_id = model_id
        self._model: Optional[Database] = None
        self._table_name = table_name
        self._schema = schema
        self._file = file
        self._reader = reader

    @transaction(on_error=partial(on_error, reraise=DatabaseUploadSaveMetadataFailed))
    def run(self) -> None:
        self.validate()
        if not self._model:
            return

        self._reader.read(self._file, self._model, self._table_name, self._schema)

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

    def validate(self) -> None:
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()
        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()
        if not self._model.db_engine_spec.supports_file_upload:
            raise DatabaseUploadNotSupported()


def on_error(ex: Exception, reraise: Any = None) -> None:
    """Обработчик ошибок для транзакций"""
    if reraise:
        raise reraise from ex
    raise ex


class UploadFieldsCommand(BaseCommand):
    """Команда для загрузки определений полей в таблицу БД с поддержкой всех типов данных"""

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
        """
        Инициализация команды

        :param model_id: ID базы данных
        :param table_name: Имя таблицы
        :param schema: Схема (опционально)
        :param already_exists: Стратегия при существующей таблице ('append' или 'replace')
        :param upload_fields: Список определений полей
        :param index_column: Столбец индекса
        :param dataframe_index: Использовать индекс DataFrame
        :param index_label: Метка индекса
        :param day_first: Первый день в датах (для парсинга)
        """
        self._model_id = model_id
        self._model = None
        self._table_name = table_name
        self._schema = schema
        self._already_exists = already_exists
        self._upload_fields = upload_fields
        self._index_column = index_column
        self._dataframe_index = dataframe_index
        self._index_label = index_label
        self._day_first = day_first

        self._reader = FieldsDataReader({
            "already_exists": already_exists,
            "uploadFields": upload_fields,
            "index_column": index_column,
            "dataframe_index": dataframe_index,
            "index_label": index_label,
            "day_first": day_first,
        })

    @transaction(on_error=partial(on_error, reraise=DatabaseUploadSaveMetadataFailed))
    def run(self) -> None:
        """Выполнение загрузки полей в таблицу"""
        self.validate()
        if not self._model:
            raise CommandException("Database not found")

        try:
            self._reader.read(None, self._model, self._table_name, self._schema)
            self._update_table_metadata()

        except DatabaseUploadFailed as ex:
            logger.exception("Ошибка загрузки данных")
            raise CommandException(f"Ошибка загрузки данных: {str(ex)}") from ex
        except Exception as ex:
            logger.exception("Неожиданная ошибка при загрузке")
            raise CommandException(f"Неожиданная ошибка: {str(ex)}") from ex

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

    def validate(self) -> None:
        """Валидация параметров перед выполнением"""
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()

        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()

        if not self._model.db_engine_spec.supports_file_upload:
            raise DatabaseUploadNotSupported()

        if self._already_exists not in ["append", "replace", "fail"]:
            raise CommandException(
                "Недопустимое значение already_exists. Допустимые значения: 'append', 'replace', 'fail'"
            )

        if not isinstance(self._upload_fields, list):
            raise CommandException("uploadFields должен быть списком словарей")

        if len(self._upload_fields) == 0:
            raise CommandException("Не указаны поля для загрузки")

        required_keys = {'name', 'type'}
        for i, field in enumerate(self._upload_fields):
            if not isinstance(field, dict):
                raise CommandException(f"Поле #{i + 1} должно быть словарем")

            missing_keys = required_keys - field.keys()
            if missing_keys:
                raise CommandException(
                    f"Поле #{i + 1} ({field.get('name', 'unnamed')}) не содержит обязательных ключей: {', '.join(missing_keys)}"
                )

            field_type = field['type'].upper()
            if field_type not in FieldsDataReader.TYPE_MAPPING:
                raise CommandException(
                    f"Неподдерживаемый тип данных '{field['type']}' для поля '{field['name']}'"
                )

        if self._index_column and self._index_column not in [f['name'] for f in
                                                             self._upload_fields]:
            raise CommandException(
                f"Столбец индекса '{self._index_column}' не найден в uploadFields")

    def __repr__(self) -> str:
        return (
            f"<UploadFieldsCommand model_id={self._model_id}, "
            f"table={self._schema}.{self._table_name}, "
            f"fields={len(self._upload_fields)}>"
        )

class FieldsDataReader(BaseDataReader):
    """Чтение данных из определений полей с поддержкой всех SQL-типов"""

    TYPE_MAPPING = {
        # Целочисленные типы
        'TINYINT': 'int8',
        'SMALLINT': 'int16',
        'INT': 'int32',
        'INTEGER': 'int32',
        'BIGINT': 'int64',
        'UINT8': 'uint8',

        # Числа с плавающей точкой
        'FLOAT': 'float32',
        'FLOAT32': 'float32',
        'FLOAT64': 'float64',
        'DOUBLE': 'float64',
        'REAL': 'float32',
        'BINARY_FLOAT': 'float32',
        'BINARY_DOUBLE': 'float64',

        # Decimal/Numeric
        'DECIMAL': 'object',
        'NUMERIC': 'object',
        'NUMBER': 'object',

        # Строковые типы
        'CHAR': 'object',
        'VARCHAR': 'object',
        'TEXT': 'object',
        'NCHAR': 'object',
        'NVARCHAR': 'object',
        'CLOB': 'object',
        'LONGTEXT': 'object',
        'FIXEDSTRING': 'object',
        'STRING': 'object',
        'LowCardinality(String)': 'object',

        # Бинарные типы
        'BINARY': 'object',
        'VARBINARY': 'object',
        'BLOB': 'object',
        'BYTEA': 'object',
        'RAW': 'object',

        # JSON
        'JSON': 'object',
        'JSONB': 'object',
        'BINARY_JSON': 'object',

        # Дата и время
        'DATE': 'datetime64[ns]',
        'TIME': 'object',
        'DATETIME': 'datetime64[ns]',
        'TIMESTAMP': 'datetime64[ns]',
        'DATETIME64': 'datetime64[ns]',
        'TIMESTAMPTZ': 'datetime64[ns]',
        'INTERVAL': 'object',

        # Логические типы
        'BOOLEAN': 'bool',
        'BIT': 'bool',
        'BOOL': 'bool',

        # Специальные типы
        'UUID': 'object',
        'XML': 'object',
        'BSON': 'object',
        'IPv4': 'object',
        'IPv6': 'object',

        # Географические типы
        'GEOMETRY': 'object',
        'POINT': 'object',
        'LINESTRING': 'object',
        'POLYGON': 'object',
        'GEOJSON': 'object',

        # Составные типы
        'ARRAY': 'object',
        'ENUM': 'object',
        'SET': 'object',
        'NESTED': 'object',
        'Nullable(T)': 'object',
        'AggregateFunction': 'object',
    }

    def __init__(self, options: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(options=options or {})
        self._day_first = options.get("day_first", False)
        self._index_column = options.get("index_column")
        self._dataframe_index = options.get("dataframe_index", False)
        self._index_label = options.get("index_label")

    def _convert_value(self, value: Any, field_type: str) -> Any:
        """Конвертация значения в соответствии с типом поля"""
        if value is None:
            return None

        field_type = field_type.upper()

        try:
            # Обработка числовых типов
            if field_type in ('TINYINT', 'SMALLINT', 'INT', 'INTEGER'):
                return int(value)
            elif field_type in ('BIGINT', 'UINT8'):
                return int(value)
            elif field_type in ('FLOAT', 'FLOAT32', 'REAL', 'BINARY_FLOAT'):
                return float(value)
            elif field_type in ('FLOAT64', 'DOUBLE', 'BINARY_DOUBLE'):
                return float(value)
            elif field_type in ('DECIMAL', 'NUMERIC', 'NUMBER'):
                from decimal import Decimal
                return Decimal(str(value))

            # Обработка строковых типов
            elif field_type in ('CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR',
                              'CLOB', 'LONGTEXT', 'FIXEDSTRING', 'STRING',
                              'LowCardinality(String)'):
                return str(value)

            # Обработка бинарных данных
            elif field_type in ('BINARY', 'VARBINARY', 'BLOB', 'BYTEA', 'RAW'):
                if isinstance(value, (bytes, bytearray)):
                    return value
                return str(value).encode()

            # Обработка даты и времени (с учетом day_first)
            elif field_type == 'DATE':
                if isinstance(value, (date, datetime)):
                    return value
                return pd.to_datetime(value, dayfirst=self._day_first).date()
            elif field_type == 'TIME':
                if isinstance(value, time):
                    return value
                return pd.to_datetime(value, dayfirst=self._day_first).time()
            elif field_type in ('DATETIME', 'TIMESTAMP', 'DATETIME64', 'TIMESTAMPTZ'):
                return pd.to_datetime(value, dayfirst=self._day_first)
            elif field_type == 'INTERVAL':
                return pd.Timedelta(value)

            # Обработка логических значений
            elif field_type in ('BOOLEAN', 'BIT', 'BOOL'):
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 't', 'y', 'yes')
                return bool(value)

            # Обработка JSON
            elif field_type in ('JSON', 'JSONB', 'BINARY_JSON'):
                import json
                if isinstance(value, str):
                    return json.loads(value)
                return value

            # Обработка специальных типов
            elif field_type == 'UUID':
                return str(value)
            elif field_type in ('XML', 'BSON', 'GEOJSON'):
                return str(value)
            elif field_type in ('IPv4', 'IPv6'):
                import ipaddress
                return ipaddress.ip_address(value)

            # Обработка составных типов
            elif field_type in ('ARRAY', 'ENUM', 'SET', 'NESTED'):
                if isinstance(value, str):
                    import json
                    try:
                        return json.loads(value)
                    except json.JSONDecodeError:
                        return value.split(',')
                return value

            # Для всех остальных типов возвращаем как есть
            return value
        except Exception as ex:
            logger.warning(
                f"Не удалось преобразовать значение {value} к типу {field_type}: {str(ex)}"
            )
            return value

    def file_to_dataframe(self, file: Any) -> pd.DataFrame:
        """Создание DataFrame из определений полей с поддержкой всех типов"""
        try:
            fields = self._options.get("uploadFields", [])
            if not fields:
                raise ValueError("Не указаны поля для загрузки")

            data = {}
            for field in fields:
                field_name = field.get('name')
                if not field_name:
                    continue

                field_type = field.get('type', 'STRING').upper()
                field_value = self._convert_value(field.get('value'), field_type)

                if field_type in ('JSON', 'JSONB', 'BINARY_JSON', 'ARRAY',
                                'ENUM', 'SET', 'NESTED', 'GEOJSON'):
                    import json
                    field_value = json.dumps(
                        field_value) if field_value is not None else None

                data[field_name] = [field_value]

            df = pd.DataFrame(data)

            # Обработка индекса
            if self._index_column and self._index_column in df.columns:
                df.set_index(self._index_column, drop=not self._dataframe_index, inplace=True)
                if self._index_label:
                    df.index.name = self._index_label
            elif self._dataframe_index:
                df.reset_index(inplace=True)

            # Преобразование типов столбцов
            for field in fields:
                field_name = field.get('name')
                field_type = field.get('type', 'STRING').upper()

                if field_name in df.columns and field_type in self.TYPE_MAPPING:
                    pandas_type = self.TYPE_MAPPING[field_type]

                    try:
                        if pandas_type == 'object':
                            continue

                        df[field_name] = df[field_name].astype(pandas_type)
                    except (ValueError, TypeError) as e:
                        logger.warning(
                            f"Не удалось преобразовать столбец {field_name} к типу {pandas_type}: {str(e)}"
                        )

            return df

        except Exception as ex:
            logger.exception(
                "Ошибка создания DataFrame из определений полей")
            raise DatabaseUploadFailed(
                _("Ошибка создания DataFrame из определений полей: %(error)s",
                  error=str(ex))
            ) from ex

    def file_metadata(self, file: Any) -> Dict[str, Any]:
        """Получение метаданных из определений полей"""
        try:
            fields = self._options.get("uploadFields", [])
            column_names = []
            column_types = []

            for field in fields:
                if 'name' in field:
                    column_names.append(field['name'])
                    column_types.append(field.get('type', 'STRING'))

            metadata = {
                "items": [{
                    "column_names": column_names,
                    "column_types": column_types,
                    "sheet_name": None,
                }]
            }

            # Добавляем информацию об индексе в метаданные
            if self._index_column:
                metadata["index_column"] = self._index_column
            if self._index_label:
                metadata["index_label"] = self._index_label
            if self._dataframe_index:
                metadata["dataframe_index"] = self._dataframe_index

            return metadata
        except Exception as ex:
            logger.exception("Ошибка получения метаданных полей")
            raise DatabaseUploadFailed(
                _("Ошибка получения метаданных полей: %(error)s", error=str(ex))
            ) from ex
