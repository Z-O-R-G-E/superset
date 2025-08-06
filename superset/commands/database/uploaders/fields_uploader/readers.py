import pandas as pd
from typing import Any, Optional, List, Dict
from flask_babel import lazy_gettext as _
from superset.models.core import Database
from superset.commands.database.exceptions import DatabaseUploadFailed, DatabaseNotFoundError
from superset.commands.database.uploaders.fields_uploader.converters import DataFrameConverter
from superset.commands.database.uploaders.fields_uploader.loaders import DatabaseLoader
from superset.commands.database.uploaders.fields_uploader.registry import type_handler_registry

class FieldsReader:
    def __init__(self, options: Optional[Dict[str, Any]] = None):
        self._options = options or {}
        self._dataframe_converter = DataFrameConverter(type_handler_registry)
        self._database_loader = DatabaseLoader(type_handler_registry)

    def read(
        self,
        database: Database,
        schema_name: Optional[str],
        table_name: str,
        fields: List[Dict[str, Any]],
    ) -> None:
        """Основной метод для чтения и загрузки данных"""
        self._validate_input(database, table_name, fields)

        df = self._dataframe_converter.convert_to_dataframe(
            database=database,
            fields=fields,
            options=self._options
        )

        self._database_loader.load_to_database(
            database=database,
            schema=schema_name,
            table_name=table_name,
            fields_metadata=fields,
            df=df,
            options=self._options
        )

    @staticmethod
    def _validate_input(
        database: Database,
        table_name: str,
        fields: List[Dict[str, Any]]
    ) -> None:
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))
        if not database:
            raise DatabaseNotFoundError()
        if not table_name or not isinstance(table_name, str):
            raise DatabaseUploadFailed(_("Неверное имя таблицы"))
