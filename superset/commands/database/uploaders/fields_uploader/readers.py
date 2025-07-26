from typing import Any, Optional, List, Dict
import pandas as pd
from flask_babel import lazy_gettext as _
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseUploadFailed,
)
from superset.commands.database.uploaders.fields_uploader.converters import \
    DataFrameConverter
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    FieldsReaderOptions
from superset.commands.database.uploaders.fields_uploader.loaders import DatabaseLoader
from superset.commands.database.uploaders.fields_uploader.registry import \
    type_handler_registry
from superset.models.core import Database


class FieldsReader:
    """Прочитать поля"""

    DBMS_MAPPING = {
        'postgresql': ['postgresql', 'postgres'],
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
