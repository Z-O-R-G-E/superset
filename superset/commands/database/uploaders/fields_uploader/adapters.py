from typing import Any, List, Dict, Optional
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import DBMS_CONFIG, \
    READ_CHUNK_SIZE
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseAdapter
from superset.models.core import Database
from sqlalchemy.sql import text as sa_text


class BaseDatabaseAdapter(IDatabaseAdapter):
    """Базовый адаптер с общей логикой"""

    def __init__(self, database: Database, dbms: str):
        self.database = database
        self.dbms = dbms

    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        return {
            field['name']: DBMS_CONFIG[self.dbms].get(
                field.get('type', '').lower(),
                DBMS_CONFIG[self.dbms]['default']
            )
            for field in fields
        }

    def get_qualified_table_name(self, table_name: str,
                                 schema: Optional[str] = None) -> str:
        """Получить полное имя таблицы с учетом схемы"""
        if schema:
            return f"{schema}.{table_name}"
        return table_name


class PostgresqlAdapter(BaseDatabaseAdapter):
    """Адаптер для PostgreSQL"""

    def __init__(self, database: Database):
        super().__init__(database, "postgresql")

    def table_exists(self, table_name: str, schema: Optional[str] = None) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                query = """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = :table_name
                        AND table_schema = COALESCE(:schema, current_schema())
                    )
                """
                result = conn.execute(
                    sa_text(query),
                    {"table_name": table_name, "schema": schema}
                )
                return result.scalar()

    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None
    ) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'string').lower()
                db_type = DBMS_CONFIG['postgresql'].get(field_type, 'TEXT')
                columns.append(f"{name} {db_type}")

            qualified_name = self.get_qualified_table_name(table_name, schema)
            create_sql = f"CREATE TABLE {qualified_name} ({', '.join(columns)})"

            if schema:
                create_sql = f"CREATE TABLE {qualified_name} ({', '.join(columns)})"
                with engine.connect() as conn:
                    conn.execute(sa_text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
                    conn.execute(sa_text(create_sql))
            else:
                with engine.connect() as conn:
                    conn.execute(sa_text(create_sql))

    def insert_data(
        self,
        table_name: str,
        data: pd.DataFrame,
        schema: Optional[str] = None,
        if_exists: str = "append"
    ) -> None:
        qualified_name = self.get_qualified_table_name(table_name, schema)
        with self.database.get_sqla_engine() as engine:
            data.to_sql(
                name=table_name,
                con=engine,
                schema=schema,
                if_exists=if_exists,
                index=False,
                chunksize=READ_CHUNK_SIZE,
                method="multi"
            )

    def drop_table(self, table_name: str, schema: Optional[str] = None) -> None:
        qualified_name = self.get_qualified_table_name(table_name, schema)
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa_text(f"DROP TABLE IF EXISTS {qualified_name}"))


class ClickhouseAdapter(BaseDatabaseAdapter):
    """Адаптер для ClickHouse"""

    def __init__(self, database: Database):
        super().__init__(database, "clickhouse")

    def table_exists(self, table_name: str, schema: Optional[str] = None) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                query = "EXISTS TABLE " + self.get_qualified_table_name(table_name,
                                                                        schema)
                result = conn.execute(sa_text(query))
                return result.scalar() == 1

    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None
    ) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'string').lower()
                db_type = DBMS_CONFIG['clickhouse'].get(field_type, 'String')
                columns.append(f"{name} {db_type}")

            qualified_name = self.get_qualified_table_name(table_name, schema)
            create_sql = f"CREATE TABLE {qualified_name} ({', '.join(columns)}) ENGINE = MergeTree() ORDER BY tuple()"

            with engine.connect() as conn:
                if schema:
                    conn.execute(sa_text(f"CREATE DATABASE IF NOT EXISTS {schema}"))
                conn.execute(sa_text(create_sql))

    def insert_data(
        self,
        table_name: str,
        data: pd.DataFrame,
        schema: Optional[str] = None,
        if_exists: str = "append"
    ) -> None:
        qualified_name = self.get_qualified_table_name(table_name, schema)
        with self.database.get_sqla_engine() as engine:
            data.to_sql(
                name=table_name,
                con=engine,
                schema=schema,
                if_exists=if_exists,
                index=False,
                chunksize=READ_CHUNK_SIZE
            )

    def drop_table(self, table_name: str, schema: Optional[str] = None) -> None:
        qualified_name = self.get_qualified_table_name(table_name, schema)
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa_text(f"DROP TABLE IF EXISTS {qualified_name}"))


class DatabaseAdapterFactory:
    """Фабрика для создания адаптеров БД."""

    _DB_ADAPTERS = {
        "clickhouse": {
            "adapter": ClickhouseAdapter,
            "aliases": ["clickhouse", "clickhousedb", "ch"],
        },
        "postgresql": {
            "adapter": PostgresqlAdapter,
            "aliases": ["postgresql", "postgres", "pg"],
        },
    }

    @classmethod
    def get_supported_dbms(cls) -> List[str]:
        """Возвращает список поддерживаемых СУБД."""
        return list(cls._DB_ADAPTERS.keys())

    @classmethod
    def get_all_aliases(cls) -> List[str]:
        """Возвращает все возможные алиасы для поддерживаемых СУБД."""
        aliases = []
        for db_data in cls._DB_ADAPTERS.values():
            aliases.extend(db_data["aliases"])
        return aliases

    @classmethod
    def create_adapter(cls, dbms: str, database: Database) -> IDatabaseAdapter:
        """Создает адаптер для указанной СУБД."""
        dbms_lower = dbms.lower()

        for db_type, db_data in cls._DB_ADAPTERS.items():
            if dbms_lower in db_data["aliases"]:
                return db_data["adapter"](database)

        supported_aliases = cls.get_all_aliases()
        raise ValueError(
            f"Неподдерживаемый тип СУБД: {dbms}. "
            f"Поддерживаемые варианты: {supported_aliases}"
        )
