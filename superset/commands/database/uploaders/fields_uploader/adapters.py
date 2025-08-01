# adapters.py
import logging
import pandas as pd
from typing import Any, List, Dict, Optional, Set, Tuple
from sqlalchemy.sql import text as sa_text
from sqlalchemy.exc import SQLAlchemyError

from superset.commands.database.uploaders.fields_uploader.registry import \
    TypeHandlerRegistry
from superset.models.core import Database
from superset.commands.database.uploaders.fields_uploader.config import DB_ADAPTERS
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseAdapter

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

        if not DatabaseAdapterFactory.is_dbms_supported(self.dbms):
            raise DatabaseAdapterError(
                f"Неподдерживаемый тип СУБД: {self.dbms}. "
                f"Поддерживаемые типы: {DatabaseAdapterFactory.get_supported_dbms_types()}"
            )

    def escape_identifier(self, identifier: str) -> str:
        """Экранировать идентификатор в соответствии с правилами СУБД"""
        escape_pattern = self.db_config.get("identifier_escape", "{}")
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
                    params = self._get_table_exists_params(table_name, schema)
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

    def _get_table_exists_params(self, table_name: str, schema: Optional[str]) -> Dict:
        """Возвращает параметры для запроса проверки существования таблицы"""
        return {"table_name": table_name, "schema": schema}

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
                create_sql = self._get_create_table_sql(qualified_name, columns)

                with engine.connect() as conn:
                    self._prepare_schema(conn, schema)
                    conn.execute(sa_text(create_sql))
                    logger.info(f"Таблица {qualified_name} успешно создана")
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

        # Добавление индексной колонки (если нужно)
        if index_label:
            resolved_type = index_type or self.db_config.get("default_index_type", "INTEGER")
            columns.append(
                f"{self.escape_identifier(index_label)} {resolved_type}"
            )

        # Остальные поля
        for field in fields:
            if not index_column or field['name'] != index_column:
                columns.append(
                    f"{self.escape_identifier(field['name'])} {self._get_column_type(field)}"
                )
        return columns

    def _get_column_type(self, field: Dict[str, Any]) -> str:
        """Возвращает тип колонки для поля"""
        field_type = field.get('type', 'string').lower()
        handler = self.type_handler_registry.get_handler_instance(field_type)
        return handler.get_dbms_specific_type(field, self.dbms)

    def _get_create_table_sql(self, qualified_name: str, columns: List[str]) -> str:
        """Возвращает SQL для создания таблицы"""
        suffix = self.db_config.get("create_table_suffix", "")
        return f"CREATE TABLE {qualified_name} ({', '.join(columns)}) {suffix}".strip()

    def _prepare_schema(self, conn, schema: Optional[str]) -> None:
        """Создает схему/базу данных если нужно"""
        if schema:
            schema_verb = self.db_config.get("schema_verb", "SCHEMA")
            conn.execute(sa_text(
                f"CREATE {schema_verb} IF NOT EXISTS {self.escape_identifier(schema)}"))

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

    def __init__(
        self,
        database: Database,
        type_handler_registry: TypeHandlerRegistry
    ):
        super().__init__(database, "postgresql", type_handler_registry)

    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None,
        index_column: Optional[str] = None,
        index_label: Optional[str] = None,
        index_type: Optional[str] = None
    ) -> None:
        """Создает таблицу в PostgreSQL с возможностью добавления индекса"""
        super().create_table(
            table_name, fields, schema, index_column, index_label, index_type
        )

        if index_label:
            with self.database.get_sqla_engine() as engine:
                with engine.connect() as conn:
                    self._create_index(conn, table_name, index_label, schema)

    def _create_index(self, conn, table_name: str, index_label: str,
                      schema: Optional[str] = None) -> None:
        """Создает индекс в PostgreSQL"""
        qualified_name = self.get_qualified_table_name(table_name, schema)
        index_name = f"idx_{table_name}_{index_label}"
        index_sql = f"CREATE INDEX {self.escape_identifier(index_name)} ON {qualified_name} ({self.escape_identifier(index_label)})"
        conn.execute(sa_text(index_sql))


class ClickhouseAdapter(BaseDatabaseAdapter):
    """Адаптер для ClickHouse"""

    def __init__(
        self,
        database: Database,
        type_handler_registry: TypeHandlerRegistry
    ):
        super().__init__(database, "clickhouse", type_handler_registry)

    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None,
        index_column: Optional[str] = None,
        index_label: Optional[str] = None,
        index_type: Optional[str] = None
    ) -> None:
        """Создает таблицу в ClickHouse с правильным ORDER BY"""
        with self.database.get_sqla_engine() as engine:
            columns, order_by = self._prepare_clickhouse_columns(
                fields, index_column, index_label, index_type
            )
            qualified_name = self.get_qualified_table_name(table_name, schema)

            with engine.connect() as conn:
                self._prepare_schema(conn, schema)
                conn.execute(sa_text(
                    f"CREATE TABLE {qualified_name} ({', '.join(columns)}) "
                    f"ENGINE = MergeTree() ORDER BY ({order_by})"
                ))
                logger.info(
                    f"Таблица ClickHouse {qualified_name} создана с ORDER BY {order_by}")

    def _prepare_clickhouse_columns(
        self,
        fields: List[Dict[str, Any]],
        index_column: Optional[str],
        index_label: Optional[str],
        index_type: Optional[str]
    ) -> Tuple[List[str], str]:
        """Подготавливает колонки и выражение ORDER BY для ClickHouse"""
        columns = []
        order_by_columns = []

        # Добавляем индексную колонку (если нужно)
        if index_label:
            resolved_type = index_type or self.db_config.get("default_index_type", "Int32")
            columns.append(f"{self.escape_identifier(index_label)} {resolved_type}")
            order_by_columns.append(self.escape_identifier(index_label))

        # Добавляем остальные поля
        for field in fields:
            if not index_column or field['name'] != index_column:
                columns.append(
                    f"{self.escape_identifier(field['name'])} {self._get_column_type(field)}"
                )

        return columns, ", ".join(order_by_columns) if order_by_columns else "tuple()"


class DatabaseAdapterFactory:
    """Фабрика для создания адаптеров БД"""

    @classmethod
    def get_supported_dbms_types(cls) -> Set[str]:
        """Возвращает множество поддерживаемых типов СУБД"""
        return set(DB_ADAPTERS.keys())

    @classmethod
    def is_dbms_supported(cls, dbms: str) -> bool:
        """Поддерживается ли указанная СУБД"""
        dbms_lower = dbms.lower()
        for db_type, db_data in DB_ADAPTERS.items():
            if dbms_lower == db_type or dbms_lower in db_data["aliases"]:
                return True
        return False

    @classmethod
    def get_all_aliases(cls) -> List[str]:
        """Возвращает все алиасы для поддерживаемых СУБД"""
        aliases = []
        for db_type, db_data in DB_ADAPTERS.items():
            aliases.append(db_type)
            aliases.extend(db_data["aliases"])
        return sorted(set(aliases))

    @classmethod
    def create_adapter(
        cls,
        dbms: str,
        database: Database,
        type_handler_registry: TypeHandlerRegistry
    ) -> IDatabaseAdapter:
        """Создает адаптер для указанной СУБД"""
        dbms_lower = dbms.lower()
        for db_type, db_data in DB_ADAPTERS.items():
            if dbms_lower == db_type or dbms_lower in db_data["aliases"]:
                adapter_class = globals()[db_data["adapter"]]
                return adapter_class(database, type_handler_registry)

        supported_types = cls.get_all_aliases()
        raise DatabaseAdapterError(
            f"Неподдерживаемый тип СУБД: {dbms}. "
            f"Поддерживаемые варианты: {supported_types}"
        )
