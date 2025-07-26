import logging
from typing import Any, Optional, List, Dict
from sqlalchemy import inspect
import pandas as pd
from flask_babel import lazy_gettext as _
from superset.commands.database.exceptions import (
    DatabaseUploadFailed,
)
from superset.commands.database.uploaders.fields_uploader.adapters import \
    DatabaseAdapterFactory
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseLoader
from superset.commands.database.uploaders.fields_uploader.registry import \
    TypeHandlerRegistry
from superset.models.core import Database


logger = logging.getLogger(__name__)

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
