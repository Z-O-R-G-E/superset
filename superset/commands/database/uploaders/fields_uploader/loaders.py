import logging
from typing import Any, Optional, List, Dict
import pandas as pd
from flask_babel import lazy_gettext as _
from superset.commands.database.exceptions import DatabaseUploadFailed
from superset.commands.database.uploaders.fields_uploader.adapters import \
    DatabaseAdapterFactory
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseAdapter
from superset.models.core import Database

logger = logging.getLogger(__name__)


class DatabaseLoader:
    """Загрузчик данных в БД"""

    def __init__(self, type_handler_registry=None):
        self.type_handler_registry = type_handler_registry

    def load_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> None:
        """Загрузить DataFrame в базу данных"""
        self._validate_input(df, database, table_name)

        dbms = options.get("dbms", "postgresql")
        if_exists = options.get("already_exists", "fail")
        adapter = DatabaseAdapterFactory.create_adapter(dbms, database)

        try:
            self._handle_table_loading(
                adapter=adapter,
                table_name=table_name,
                schema=schema,
                fields_metadata=fields_metadata,
                df=df,
                if_exists=if_exists
            )
        except Exception as e:
            logger.error(f"Ошибка при загрузке данных: {str(e)}", exc_info=True)
            raise DatabaseUploadFailed(
                _("Ошибка загрузки данных: %(error)s", error=str(e)))

    def _handle_table_loading(
        self,
        adapter: IDatabaseAdapter,
        table_name: str,
        schema: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        df: pd.DataFrame,
        if_exists: str
    ) -> None:
        """Обработать загрузку таблицы в зависимости от режима if_exists"""
        table_exists = adapter.table_exists(table_name, schema)

        if if_exists == "fail":
            if table_exists:
                raise DatabaseUploadFailed(_("Таблица уже существует"))
            self._create_table_and_insert_data(adapter, table_name, schema, fields_metadata, df)

        elif if_exists == "replace":
            if table_exists:
                adapter.drop_table(table_name, schema)
            self._create_table_and_insert_data(adapter, table_name, schema, fields_metadata, df)

        elif if_exists == "append":
            if table_exists:
                self._insert_data(adapter, table_name, schema, df)
            else:
                self._create_table_and_insert_data(adapter, table_name, schema, fields_metadata, df)

        else:
            raise DatabaseUploadFailed(
                _("Неподдерживаемое значение if_exists: %(value)s", value=if_exists))

    def _create_table_and_insert_data(
        self,
        adapter: IDatabaseAdapter,
        table_name: str,
        schema: Optional[str],
        fields_metadata: List[Dict[str, Any]],
        df: pd.DataFrame
    ) -> None:
        """Создать таблицу и вставить данные"""
        adapter.create_table(table_name, fields_metadata, schema)
        self._insert_data(adapter, table_name, schema, df)

    def _insert_data(
        self,
        adapter: IDatabaseAdapter,
        table_name: str,
        schema: Optional[str],
        df: pd.DataFrame
    ) -> None:
        """Вставить данные в таблицу"""
        adapter.insert_data(table_name, df, schema, "append")

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
