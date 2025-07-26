# Константы
READ_CHUNK_SIZE = 1000

# Базовые маппинги типов
BASE_TYPE_MAPPING = {
    "integer": {"pandas": "Int64", "handler": "IntegerHandler"},
    "float": {"pandas": "float64", "handler": "FloatHandler"},
    "decimal": {"pandas": "object", "handler": "DecimalHandler"},
    "string": {"pandas": "string", "handler": "StringHandler"},
    "date": {"pandas": "datetime64[ns]", "handler": "DateHandler"},
    "datetime": {"pandas": "datetime64[ns]", "handler": "DateTimeHandler"},
    "boolean": {"pandas": "boolean", "handler": "BooleanHandler"},
}

DBMS_CONFIG = {
    "postgresql": {
        "integer": "BIGINT",
        "float": "DOUBLE PRECISION",
        "decimal": "NUMERIC",
        "string": "TEXT",
        "date": "DATE",
        "datetime": "TIMESTAMP",
        "boolean": "BOOLEAN"
    },
    "clickhouse": {
        "integer": "Int64",
        "float": "Float64",
        "decimal": "Decimal(38, 6)",
        "string": "String",
        "date": "Date",
        "datetime": "DateTime",
        "boolean": "UInt8"
    }
}

# Автоматическое заполнение TYPE_MAPPING
TYPE_MAPPING = {}
for dbms, types in DBMS_CONFIG.items():
    for type_name, db_type in types.items():
        base_type = BASE_TYPE_MAPPING.get(type_name)
        if base_type and db_type not in TYPE_MAPPING:
            TYPE_MAPPING[db_type.split('(')[0].upper()] = base_type

# Дополнительные специфичные типы
EXTRA_TYPE_MAPPING = {
    "TINYINT": BASE_TYPE_MAPPING["integer"],
    "SMALLINT": BASE_TYPE_MAPPING["integer"],
    "INT": BASE_TYPE_MAPPING["integer"],
    "INTEGER": BASE_TYPE_MAPPING["integer"],
    "BIGINT": BASE_TYPE_MAPPING["integer"],
    "UINT8": BASE_TYPE_MAPPING["integer"],
    "Int64": BASE_TYPE_MAPPING["integer"],
    "FLOAT": BASE_TYPE_MAPPING["float"],
    "FLOAT32": BASE_TYPE_MAPPING["float"],
    "FLOAT64": BASE_TYPE_MAPPING["float"],
    "DOUBLE": BASE_TYPE_MAPPING["float"],
    "REAL": BASE_TYPE_MAPPING["float"],
    "BINARY_FLOAT": BASE_TYPE_MAPPING["float"],
    "BINARY_DOUBLE": BASE_TYPE_MAPPING["float"],
    "DECIMAL": BASE_TYPE_MAPPING["decimal"],
    "NUMERIC": BASE_TYPE_MAPPING["decimal"],
    "NUMBER": BASE_TYPE_MAPPING["decimal"],
    "BOOLEAN": BASE_TYPE_MAPPING["boolean"],
    "BIT": BASE_TYPE_MAPPING["boolean"],
    "BOOL": BASE_TYPE_MAPPING["boolean"],
    "UInt8": BASE_TYPE_MAPPING["boolean"],
    "DATE": BASE_TYPE_MAPPING["date"],
    "TIME": {"pandas": "object", "handler": "TimeHandler"},
    "DATETIME": BASE_TYPE_MAPPING["datetime"],
    "TIMESTAMP": BASE_TYPE_MAPPING["datetime"],
    "DATETIME64": BASE_TYPE_MAPPING["datetime"],
    "TIMESTAMPTZ": {"pandas": "datetime64[ns, UTC]", "handler": "DateTimeTzHandler"},
    "CHAR": BASE_TYPE_MAPPING["string"],
    "VARCHAR": BASE_TYPE_MAPPING["string"],
    "TEXT": BASE_TYPE_MAPPING["string"],
    "NCHAR": BASE_TYPE_MAPPING["string"],
    "NVARCHAR": BASE_TYPE_MAPPING["string"],
    "CLOB": BASE_TYPE_MAPPING["string"],
    "LONGTEXT": BASE_TYPE_MAPPING["string"],
    "FIXEDSTRING": BASE_TYPE_MAPPING["string"],
    "STRING": BASE_TYPE_MAPPING["string"],
}
TYPE_MAPPING.update(EXTRA_TYPE_MAPPING)

# Реестр обработчиков
HANDLER_TYPES = {}
for type_name, type_info in TYPE_MAPPING.items():
    handler_name = type_info.get("handler")
    if handler_name:
        HANDLER_TYPES.setdefault(handler_name, []).append(type_name)
