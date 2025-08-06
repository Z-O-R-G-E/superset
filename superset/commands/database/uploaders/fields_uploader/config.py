# Конфигурации типов данных
TYPE_CONFIG = {
    "integer": {
        "pandas": "Int64",
        "sqlalchemy": "BigInteger",
        "handler": "IntegerHandler",
        "db_types": {
            "postgresql": {
                "TINYINT": "SMALLINT",
                "SMALLINT": "SMALLINT",
                "INT2": "SMALLINT",
                "INT": "INTEGER",
                "INTEGER": "INTEGER",
                "BIGINT": "BIGINT",
                "INT16": "SMALLINT",
                "INT32": "INTEGER",
                "INT64": "BIGINT",
                "UINT8": "BIGINT",
                "*": "BIGINT"
            },
            "clickhouse": {
                "TINYINT": "Int8",
                "SMALLINT": "Int16",
                "INT2": "Int16",
                "INT": "Int32",
                "INTEGER": "Int32",
                "BIGINT": "Int64",
                "INT16": "Int16",
                "INT32": "Int32",
                "INT64": "Int64",
                "UINT8": "UInt8",
                "*": "Int64"
            },
            "*": "BIGINT"
        },
        "aliases": ["TINYINT", "SMALLINT", "INT2", "INT", "INTEGER", "BIGINT", "INT16", "INT32", "INT64"]
    },
    "float": {
        "pandas": "float64",
        "sqlalchemy": "Float",
        "handler": "FloatHandler",
        "db_types": {
            "postgresql": {
                "FLOAT4": "REAL",
                "FLOAT32": "REAL",
                "FLOAT": "DOUBLE PRECISION",
                "FLOAT8": "DOUBLE PRECISION",
                "FLOAT64": "DOUBLE PRECISION",
                "DOUBLE": "DOUBLE PRECISION",
                "REAL": "REAL",
                "*": "DOUBLE PRECISION"
            },
            "clickhouse": {
                "FLOAT4": "Float32",
                "FLOAT32": "Float32",
                "FLOAT": "Float64",
                "FLOAT8": "Float64",
                "FLOAT64": "Float64",
                "DOUBLE": "Float64",
                "REAL": "Float32",
                "*": "Float64"
            },
            "*": "DOUBLE PRECISION"
        },
        "precision_mapping": {
            "FLOAT4": 24,
            "FLOAT32": 24,
            "REAL": 24,
            "*": 53
        },
        "aliases": ["FLOAT", "FLOAT4", "FLOAT8", "FLOAT32", "FLOAT64", "DOUBLE", "REAL"]
    },
    "decimal": {
        "pandas": "object",
        "sqlalchemy": "Numeric",
        "handler": "DecimalHandler",
        "db_types": {
            "postgresql": "NUMERIC({precision}, {scale})",
            "clickhouse": "Decimal({precision}, {scale})",
            "*": "NUMERIC({precision}, {scale})"
        },
        "default_precision": 18,
        "default_scale": 4,
        "aliases": ["DECIMAL", "NUMERIC"]
    },
    "string": {
        "pandas": "string",
        "sqlalchemy": "String",
        "handler": "StringHandler",
        "db_types": {
            "postgresql": {
                "CHAR": "CHAR({size})",
                "VARCHAR": "VARCHAR({size})",
                "*": "TEXT"
            },
            "clickhouse": {
                "CHAR": "FixedString({size})",
                "VARCHAR": "FixedString({size})",
                "STRING": "String",
                "FIXEDSTRING": "FixedString({size})",
                "*": "String"
            },
            "*": "TEXT"
        },
        "default_size": 255,
        "aliases": ["CHAR", "VARCHAR", "FIXEDSTRING", "STRING", "TEXT"]
    },
    "date": {
        "pandas": "datetime64[ns]",
        "sqlalchemy": "Date",
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
        "sqlalchemy": "Time",
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
        "sqlalchemy": "DateTime",
        "handler": "DateTimeHandler",
        "db_types": {
            "postgresql": "TIMESTAMP",
            "clickhouse": "DateTime",
            "*": "TIMESTAMP"
        },
        "aliases": ["DATETIME", "TIMESTAMP"]
    },
    "datetimetz": {
        "pandas": "datetime64[ns, UTC]",
        "sqlalchemy": "DateTime(timezone=True)",
        "handler": "DateTimeTzHandler",
        "db_types": {
            "postgresql": "TIMESTAMP WITH TIME ZONE",
            "clickhouse": "DateTime64(3, 'UTC')",
            "*": "TIMESTAMP WITH TIME ZONE"
        },
        "aliases": ["TIMESTAMPTZ", "DATETIMETZ"]
    },
    "boolean": {
        "pandas": "boolean",
        "sqlalchemy": "Boolean",
        "handler": "BooleanHandler",
        "db_types": {
            "postgresql": "BOOLEAN",
            "clickhouse": "UInt8",
            "*": "BOOLEAN"
        },
        "aliases": ["BOOLEAN", "BOOL"]
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
        "create_table_suffix": "ENGINE = MergeTree() ORDER BY tuple()",
        "default_index_type": "UInt32",
        "default_insert_method": None
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
        "create_table_suffix": "",
        "default_index_type": "INTEGER",
        "default_insert_method": "multi"
    }
}

TYPE_MAPPING = {}
for type_name, config in TYPE_CONFIG.items():
    type_entry = {
        "pandas": config["pandas"],
        "sqlalchemy": config["sqlalchemy"],
        "handler": config["handler"]
    }
    TYPE_MAPPING[type_name.upper()] = type_entry
    for alias in config["aliases"]:
        TYPE_MAPPING[alias.upper()] = type_entry
