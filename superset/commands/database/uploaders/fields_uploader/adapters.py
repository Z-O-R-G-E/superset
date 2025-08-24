import logging
import pandas as pd

from typing import Any, List, Dict, Optional, Set
from sqlalchemy.sql import text as sa_text
from sqlalchemy.exc import SQLAlchemyError

from superset.commands.database.uploaders.fields_uploader.registry import TypeHandlerRegistry
from superset.commands.database.uploaders.fields_uploader.utils import get_column_type
from superset.models.core import Database
from superset.commands.database.uploaders.fields_uploader.config import DB_ADAPTERS, \
    normalize_dbms_name
from superset.commands.database.uploaders.fields_uploader.interfaces import IDatabaseAdapter

logger = logging.getLogger(__name__)


class DatabaseAdapterError(Exception):
    """Базовое исключение для ошибок адаптера БД"""
    pass


class BaseDatabaseAdapter(IDatabaseAdapter):
    """Базовый адаптер"""

    def __init__(
        self,
        database: Database,
        dbms: str,
        type_handler_registry: TypeHandlerRegistry
    ):
        self.database = database
        self.dbms = dbms.lower()
        self.db_config = DB_ADAPTERS.get(self.dbms, {})
        self.type_handler_registry = type_handler_registry

    def escape_identifier(self, identifier: str) -> str:
        """Экранировать идентификатор в соответствии с правилами СУБД"""
        escape_pattern = self.db_config.get("identifier_escape")
        return escape_pattern.format(identifier)

    def get_qualified_table_name(self, table_name: str,
                                 schema: Optional[str] = None) -> str:
        """Получить полное имя таблицы с учетом схемы"""
        table_name_escaped = self.escape_identifier(table_name)
        if schema:
            schema_escaped = self.escape_identifier(schema)
            return f"{schema_escaped}.{table_name_escaped}"
        return table_name_escaped

    def table_exists(self, table_name: str, schema: Optional[str] = None) -> bool:
        """Проверяет существование таблицы в БД"""
        try:
            with self.database.get_sqla_engine() as engine:
                with engine.connect() as conn:
                    query = self._get_table_exists_query(table_name, schema)
                    params = {"table_name": table_name, "schema": schema}
                    result = conn.execute(sa_text(query), params)
                    return bool(result.scalar())
        except SQLAlchemyError as ex:
            logger.error(f"Ошибка при проверке существования таблицы: {ex}")
            raise DatabaseAdapterError(
                f"Не удалось проверить существование таблицы: {ex}") from ex

    def _get_table_exists_query(self, table_name: str, schema: Optional[str]) -> str:
        """Возвращает SQL-запрос для проверки существования таблицы"""
        qualified_name = self.get_qualified_table_name(table_name, schema)
        return self.db_config.get("table_exists_query", "").format(
            qualified_name=qualified_name
        )

    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None,
        index_column: Optional[str] = None,
        index_label: Optional[str] = None,
        index_type: Optional[str] = None
    ) -> None:
        """Создает таблицу в БД с указанными полями"""
        try:
            with self.database.get_sqla_engine() as engine:
                columns = self._prepare_table_columns(
                    fields,
                    index_column,
                    index_label,
                    index_type
                )
                qualified_name = self.get_qualified_table_name(table_name, schema)
                create_sql = self._get_create_table_sql(qualified_name, columns, index_label)

                with engine.connect() as conn:
                    self._prepare_schema(conn, schema)
                    conn.execute(sa_text(create_sql))
                    logger.info(f"Таблица {qualified_name} успешно создана")

                    if index_label:
                        self._create_index(conn, table_name, index_label, schema)
        except SQLAlchemyError as ex:
            logger.error(f"Ошибка при создании таблицы: {ex}")
            raise DatabaseAdapterError(f"Не удалось создать таблицу: {ex}") from ex

    def _prepare_table_columns(
        self,
        fields: List[Dict[str, Any]],
        index_column: Optional[str] = None,
        index_label: Optional[str] = None,
        index_type: Optional[str] = None
    ) -> List[str]:
        """Подготавливает список колонок для создания таблицы"""
        columns = []

        if index_label:
            resolved_type = index_type or self.db_config.get("default_index_type")
            columns.append(
                f"{self.escape_identifier(index_label)} {resolved_type}"
            )

        for field in fields:
            if index_column and field['name'] == index_column:
                continue
            columns.append(
                f"{self.escape_identifier(field['name'])} {self._set_column_nullable(field)}"
            )

        return columns

    def _set_column_nullable(self, field: Dict[str, Any]) -> str:
        """Установить полю nullable"""

        raw_type = get_column_type(field, self.dbms, self.type_handler_registry)

        if field.get('is_required', False):
            return self.db_config.get("set_not_null").format(raw_type=raw_type)
        return self.db_config.get("set_nullable").format(raw_type=raw_type)

    def _get_create_table_sql(
        self,
        qualified_name: str,
        columns: List[str],
        index_label: Optional[str] = None
    ) -> str:
        """Возвращает SQL для создания таблицы"""
        suffix = self.db_config.get("create_table_suffix", "")
        return f"CREATE TABLE {qualified_name} ({', '.join(columns)}) {suffix}".strip()

    def _prepare_schema(self, conn, schema: Optional[str]) -> None:
        """Создает схему/базу данных если нужно"""
        if schema:
            schema_verb = self.db_config.get("schema_verb")
            conn.execute(sa_text(
                f"CREATE {schema_verb} IF NOT EXISTS {self.escape_identifier(schema)}"))

    def _create_index(self, conn, table_name: str, index_label: str,
                      schema: Optional[str] = None) -> None:
        """Создает индекс"""
        pass

    def insert_data(
        self,
        table_name: str,
        data: pd.DataFrame,
        schema: Optional[str] = None,
        if_exists: str = "append",
        index: bool = False,
        index_label: Optional[str] = None
    ) -> None:
        """Вставляет данные в таблицу"""
        try:
            with self.database.get_sqla_engine() as engine:
                data.to_sql(
                    name=table_name,
                    con=engine,
                    schema=schema,
                    if_exists=if_exists,
                    index=index,
                    index_label=index_label,
                    method=self.db_config.get("default_insert_method", None)
                )
                logger.info(
                    f"Данные вставлены в {self.get_qualified_table_name(table_name, schema)}")
        except SQLAlchemyError as ex:
            logger.error(f"Ошибка при вставке данных: {ex}")
            raise DatabaseAdapterError(f"Не удалось вставить данные: {ex}") from ex

    def drop_table(self, table_name: str, schema: Optional[str] = None) -> None:
        """Удаляет таблицу из БД"""
        try:
            qualified_name = self.get_qualified_table_name(table_name, schema)
            with self.database.get_sqla_engine() as engine:
                with engine.connect() as conn:
                    conn.execute(sa_text(f"DROP TABLE IF EXISTS {qualified_name}"))
                    logger.info(f"Таблица {qualified_name} успешно удалена")
        except SQLAlchemyError as ex:
            logger.error(f"Ошибка при удалении таблицы: {ex}")
            raise DatabaseAdapterError(f"Не удалось удалить таблицу: {ex}") from ex


class PostgresqlAdapter(BaseDatabaseAdapter):
    """Адаптер для PostgreSQL"""
    def _create_index(self, conn, table_name: str, index_label: str,
                      schema: Optional[str] = None) -> None:
        """Создает индекс в PostgreSQL"""
        qualified_name = self.get_qualified_table_name(table_name, schema)
        index_name = f"idx_{table_name}_{index_label}"
        index_sql = f"CREATE INDEX {self.escape_identifier(index_name)} ON {qualified_name} ({self.escape_identifier(index_label)})"
        conn.execute(sa_text(index_sql))
        logger.info(f"Создан индекс {index_name} для таблицы {qualified_name}")


class ClickhouseAdapter(BaseDatabaseAdapter):
    """Адаптер для ClickHouse"""

    def _get_create_table_sql(
        self,
        qualified_name: str,
        columns: List[str],
        index_label: Optional[str] = None
    ) -> str:
        if index_label:
            order_by = f"({self.escape_identifier(index_label)})"
        else:
            order_by = "tuple()"

        return f"CREATE TABLE {qualified_name} ({', '.join(columns)}) ENGINE = MergeTree() ORDER BY {order_by}"


class DatabaseAdapterFactory:
    """Фабрика для создания адаптеров БД"""

    @classmethod
    def _resolve_dbms_type(cls, dbms: str) -> Optional[str]:
        return normalize_dbms_name(dbms)

    @classmethod
    def get_supported_dbms_types(cls) -> Set[str]:
        """Возвращает множество поддерживаемых типов СУБД"""
        return set(DB_ADAPTERS.keys())

    @classmethod
    def get_all_aliases(cls) -> List[str]:
        """Возвращает все алиасы для поддерживаемых СУБД"""
        aliases = []
        for db_type, db_data in DB_ADAPTERS.items():
            aliases.append(db_type)
            aliases.extend(db_data.get("aliases", []))
        return sorted(set(aliases))

    @classmethod
    def create_adapter(
        cls,
        dbms: Optional[str],
        database: Database,
        type_handler_registry: TypeHandlerRegistry
    ) -> IDatabaseAdapter:
        """Создает адаптер для указанной СУБД"""
        if not dbms:
            raise DatabaseAdapterError(
                "Не указан тип СУБД. Необходимо указать поддерживаемый тип СУБД."
            )

        resolved_dbms = cls._resolve_dbms_type(dbms)
        if not resolved_dbms:
            supported_types = cls.get_all_aliases()
            raise DatabaseAdapterError(
                f"Неподдерживаемый тип СУБД: {dbms}. "
                f"Поддерживаемые варианты: {supported_types}"
            )

        db_data = DB_ADAPTERS[resolved_dbms]
        adapter_class = globals()[db_data["adapter"]]
        return adapter_class(database, resolved_dbms, type_handler_registry)
