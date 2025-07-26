from typing import Any, List, Dict
import sqlalchemy as sa
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import DBMS_CONFIG, \
    READ_CHUNK_SIZE
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IDatabaseAdapter
from superset.models.core import Database


class PostgresqlAdapter(IDatabaseAdapter):
    """Адаптер для PostgreSQL"""

    def __init__(self, database: Database):
        self.database = database

    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'text').upper()
                db_type = DBMS_CONFIG['postgresql'].get(field_type.lower(), 'TEXT')
                columns.append(f"{name} {db_type}")

            create_sql = f"CREATE TABLE {table_name} ({', '.join(columns)})"
            with engine.connect() as conn:
                conn.execute(sa.text(create_sql))

    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        with self.database.get_sqla_engine() as engine:
            data.to_sql(
                table_name,
                engine,
                if_exists='append',
                index=False,
                chunksize=READ_CHUNK_SIZE
            )

    def table_exists(self, table_name: str) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(
                    sa.text(
                        f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table_name}')"
                    )
                )
                return result.scalar()

    def drop_table(self, table_name: str) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa.text(f"DROP TABLE IF EXISTS {table_name}"))

    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        return {
            field['name']: DBMS_CONFIG['postgresql'].get(field.get('type', '').lower(), 'TEXT')
            for field in fields
        }


class ClickhouseAdapter(IDatabaseAdapter):
    """Адаптер для ClickHouse"""

    def __init__(self, database: Database):
        self.database = database

    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        with self.database.get_sqla_engine() as engine:
            columns = []
            for field in fields:
                name = field['name']
                field_type = field.get('type', 'text').upper()
                db_type = DBMS_CONFIG['clickhouse'].get(field_type.lower(), 'String')
                columns.append(f"{name} {db_type}")

            create_sql = f"CREATE TABLE {table_name} ({', '.join(columns)}) ENGINE = MergeTree() ORDER BY tuple()"
            with engine.connect() as conn:
                conn.execute(sa.text(create_sql))

    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(sa.text(f"DESCRIBE TABLE {table_name}"))
                table_columns = [row[0] for row in result]

                valid_columns = [col for col in data.columns if col in table_columns]
                if not valid_columns:
                    raise ValueError("Нет совпадающих столбцов между DataFrame и таблицей")

                data = data[valid_columns].to_dict('records')
                columns_sql = ", ".join(valid_columns)
                placeholders = ", ".join([f":{col}" for col in valid_columns])
                insert_sql = f"INSERT INTO {table_name} ({columns_sql}) VALUES ({placeholders})"

                conn.execute(sa.text(insert_sql), data)

    def table_exists(self, table_name: str) -> bool:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                result = conn.execute(
                    sa.text(f"EXISTS TABLE {table_name}")
                )
                return result.scalar() == 1

    def drop_table(self, table_name: str) -> None:
        with self.database.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(sa.text(f"DROP TABLE IF EXISTS {table_name}"))

    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        return {
            field['name']: DBMS_CONFIG['clickhouse'].get(field.get('type', '').lower(), 'String')
            for field in fields
        }

class DatabaseAdapterFactory:
    """Фабрика для создания адаптеров БД."""

    _DB_ADAPTERS: Dict[str, Dict] = {
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

        for db_data in cls._DB_ADAPTERS.values():
            if dbms_lower in db_data["aliases"]:
                return db_data["adapter"](database)

        supported_aliases = cls.get_all_aliases()
        raise ValueError(
            f"Неподдерживаемый тип СУБД: {dbms}. "
            f"Поддерживаемые варианты: {supported_aliases}"
        )
