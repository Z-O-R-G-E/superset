# loaders.py (минимальные изменения)
import logging
import pandas as pd

from typing import Any, Optional, List, Dict
from flask_babel import lazy_gettext as _

from superset.commands.database.exceptions import DatabaseUploadFailed, \
    DatabaseNotFoundError
from superset.commands.database.uploaders.fields_uploader.adapters import \
    DatabaseAdapterFactory
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseAdapter
from superset.commands.database.uploaders.fields_uploader.registry import \
    TypeHandlerRegistry
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

        dbms = options.get("dbms", "postgresql")
        adapter = DatabaseAdapterFactory.create_adapter(
            dbms,
            database,
            self.type_handler_registry
        )

        try:
            self._handle_table_loading(
                adapter=adapter,
                schema=schema,
                table_name=table_name,
                fields_metadata=fields_metadata,
                df=df,
                options=options
            )
        except Exception as e:
            logger.error(f"Ошибка при загрузке данных: {str(e)}", exc_info=True)
            raise DatabaseUploadFailed(
                _("Ошибка загрузки данных: %(error)s", error=str(e)))

    def _handle_table_loading(
        self,
        adapter: IDatabaseAdapter,
        schema: Optional[str],
        table_name: str,
        fields_metadata: List[Dict[str, Any]],
        df: pd.DataFrame,
        options: Dict[str, Any]
    ) -> None:
        """Обработать загрузку таблицы"""
        if_exists = options.get("already_exists", "fail")
        table_exists = adapter.table_exists(table_name, schema)

        if if_exists == "fail" and table_exists:
            raise DatabaseUploadFailed(_("Таблица уже существует"))
        elif if_exists == "replace" and table_exists:
            adapter.drop_table(table_name, schema)

        use_index = options.get("dataframe_index", False)
        index_column = options.get("index_column") if use_index else None
        index_label = options.get("index_label")
        index_type = options.get("index_type")

        if not table_exists or if_exists == "replace":
            adapter.create_table(
                table_name,
                fields_metadata,
                schema,
                index_column=index_column,
                index_label=index_label,
                index_type=index_type
            )

        adapter.insert_data(
            table_name,
            df,
            schema,
            if_exists="append",
            index=use_index,
            index_label=index_label if use_index else None
        )

    def _validate_input(
        self,
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
