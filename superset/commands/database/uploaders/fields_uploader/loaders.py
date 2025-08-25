import logging
import pandas as pd

from typing import Any, Optional, List, Dict
from flask_babel import lazy_gettext as _

from superset.commands.database.exceptions import DatabaseUploadFailed, DatabaseNotFoundError
from superset.commands.database.uploaders.fields_uploader.adapters import DatabaseAdapterFactory
from superset.commands.database.uploaders.fields_uploader.registry import TypeHandlerRegistry
from superset.models.core import Database

logger = logging.getLogger(__name__)

class DatabaseLoader:
    """Загрузчик данных в БД"""

    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def load_to_database(
        self,
        database: Database,
        schema: Optional[str],
        table_name: str,
        fields_metadata: List[Dict[str, Any]],
        df: pd.DataFrame,
        options: Dict[str, Any]
    ) -> None:
        """Загрузить DataFrame в базу данных"""
        self._validate_input(database, table_name, df)

        dbms = options.get("dbms")
        adapter = DatabaseAdapterFactory.create_adapter(
            dbms,
            database,
            self.type_handler_registry
        )

        try:
            adapter.load_data(
                table_name=table_name,
                df=df,
                schema=schema,
                fields_metadata=fields_metadata,
                options=options
            )
        except Exception as e:
            logger.error(f"Ошибка при загрузке данных: {str(e)}", exc_info=True)
            raise DatabaseUploadFailed(
                _("Ошибка загрузки данных: %(error)s", error=str(e)))

    @staticmethod
    def _validate_input(
        database: Database,
        table_name: str,
        df: pd.DataFrame
    ) -> None:
        if df.empty:
            raise DatabaseUploadFailed(_("Невозможно загрузить пустой DataFrame"))
        if not table_name or not isinstance(table_name, str):
            raise DatabaseUploadFailed(_("Неверное имя таблицы"))
        if not database:
            raise DatabaseNotFoundError()
