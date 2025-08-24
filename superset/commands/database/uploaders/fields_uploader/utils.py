from typing import Dict, Any

from superset.commands.database.uploaders.fields_uploader.registry import \
    TypeHandlerRegistry

def get_column_type(field: Dict[str, Any], dbms_type: str, type_handler_registry: TypeHandlerRegistry) -> str:
    """Получить тип колонки"""
    field_type = field.get('type', 'string').lower()
    handler = type_handler_registry.get_handler_instance(field_type)
    return handler.get_dbms_specific_type(field, dbms_type)
