# Конфигурации типов данных
TYPE_CONFIG = {
    "integer": {
        "pandas": "Int64",
        "handler": "IntegerHandler",
        "db_types": {
            "postgresql": "BIGINT",
            "clickhouse": "Int64",
            "*": "BIGINT"
        },
        "aliases": ["TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT", "UINT8"]
    },
    "float": {
        "pandas": "float64",
        "handler": "FloatHandler",
        "db_types": {
            "postgresql": "DOUBLE PRECISION",
            "clickhouse": "Float64",
            "*": "DOUBLE PRECISION"
        },
        "aliases": ["FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL", "BINARY_FLOAT", "BINARY_DOUBLE"]
    },
    "decimal": {
        "pandas": "object",
        "handler": "DecimalHandler",
        "db_types": {
            "postgresql": "NUMERIC",
            "clickhouse": "Decimal(38, 6)",
            "*": "NUMERIC"
        },
        "aliases": ["DECIMAL", "NUMERIC", "NUMBER"]
    },
    "string": {
        "pandas": "string",
        "handler": "StringHandler",
        "db_types": {
            "postgresql": "TEXT",
            "clickhouse": "String",
            "*": "TEXT"
        },
        "aliases": ["CHAR", "VARCHAR", "TEXT", "NCHAR", "NVARCHAR", "CLOB", "LONGTEXT", "FIXEDSTRING"]
    },
    "date": {
        "pandas": "datetime64[ns]",
        "handler": "DateHandler",
        "db_types": {
            "postgresql": "DATE",
            "clickhouse": "Date",
            "*": "DATE"
        },
        "aliases": ["DATE"]
    },
    "time": {
        "pandas": "object",
        "handler": "TimeHandler",
        "db_types": {
            "postgresql": "TIME",
            "clickhouse": "DateTime",
            "*": "TIME"
        },
        "aliases": ["TIME"]
    },
    "datetime": {
        "pandas": "datetime64[ns]",
        "handler": "DateTimeHandler",
        "db_types": {
            "postgresql": "TIMESTAMP",
            "clickhouse": "DateTime",
            "*": "TIMESTAMP"
        },
        "aliases": ["DATETIME", "TIMESTAMP", "DATETIME64"]
    },
    "datetimetz": {
        "pandas": "datetime64[ns, UTC]",
        "handler": "DateTimeTzHandler",
        "db_types": {
            "postgresql": "TIMESTAMP WITH TIME ZONE",
            "clickhouse": "DateTime",
            "*": "TIMESTAMP WITH TIME ZONE"
        },
        "aliases": ["TIMESTAMPTZ"]
    },
    "boolean": {
        "pandas": "boolean",
        "handler": "BooleanHandler",
        "db_types": {
            "postgresql": "BOOLEAN",
            "clickhouse": "UInt8",
            "*": "BOOLEAN"
        },
        "aliases": ["BOOLEAN", "BIT", "BOOL"]
    }
}

# Конфигурации адаптеров БД
DB_ADAPTERS = {
    "clickhouse": {
        "adapter": "ClickhouseAdapter",
        "aliases": ["clickhouse", "clickhousedb", "ch"],
        "identifier_escape": "`{}`",
        "schema_verb": "DATABASE",
        "table_exists_query": "EXISTS TABLE {qualified_name}",
        "create_table_suffix": "ENGINE = MergeTree() ORDER BY tuple()"
    },
    "postgresql": {
        "adapter": "PostgresqlAdapter",
        "aliases": ["postgresql", "postgres", "pg"],
        "identifier_escape": '"{}"',
        "schema_verb": "SCHEMA",
        "table_exists_query": """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = :table_name
                AND table_schema = COALESCE(:schema, current_schema())
            )
        """,
        "create_table_suffix": ""
    }
}

# Генерация TYPE_MAPPING
TYPE_MAPPING = {}
for type_name, config in TYPE_CONFIG.items():
    type_entry = {
        "pandas": config["pandas"],
        "handler": config["handler"]
    }
    TYPE_MAPPING[type_name.upper()] = type_entry
    for alias in config["aliases"]:
        TYPE_MAPPING[alias.upper()] = type_entry
