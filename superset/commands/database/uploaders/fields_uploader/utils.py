from typing import Any, Optional, List
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import TYPE_MAPPING


class NullChecker:
    """Класс для централизованной проверки значений на null"""

    def __init__(self, null_values: List[str] = None):
        self.null_values = self._process_null_values(null_values or [])

    def _process_null_values(self, null_values: List[str]) -> set:
        """Обработать значения null"""
        processed = set()
        for val in null_values:
            processed.add("" if val == '""' else val.lower())
        return processed

    def is_null(self, value: Any, field_type: Optional[str] = None) -> bool:
        """Проверить, является ли значение NULL"""
        if value is None:
            return True

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return True
            if field_type and self._is_string_type(field_type):
                return value.lower() in self.null_values

        return str(value).lower() in self.null_values

    def _is_string_type(self, field_type: str) -> bool:
        """Проверить, является ли тип строковым"""
        type_info = TYPE_MAPPING.get(field_type.upper(), {})
        return type_info.get("handler") == "StringHandler"

    def process_value(self, value: Any, field_type: Optional[str] = None) -> Any:
        """Обработать значение"""
        if self.is_null(value, field_type):
            return None

        if field_type and self._is_string_type(field_type):
            if isinstance(value, str):
                return value.strip()
            return str(value)

        return value
