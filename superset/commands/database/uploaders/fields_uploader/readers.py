from typing import Any, Optional, List, Dict
import pandas as pd
from flask_babel import lazy_gettext as _
from superset.commands.database.exceptions import DatabaseUploadFailed, DatabaseNotFoundError
from superset.commands.database.uploaders.fields_uploader.converters import DataFrameConverter
from superset.commands.database.uploaders.fields_uploader.loaders import DatabaseLoader
from superset.commands.database.uploaders.fields_uploader.registry import type_handler_registry
from superset.models.core import Database

class FieldsReader:
    """Прочитать поля"""
    def __init__(self, options: Optional[Dict[str, Any]] = None):
        self._options = options or {}
        self._dataframe_converter = DataFrameConverter(type_handler_registry)
        self._database_loader = DatabaseLoader(type_handler_registry)

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
