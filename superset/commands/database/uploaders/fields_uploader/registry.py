import logging
from functools import lru_cache
from typing import Any, Optional, List, Dict, Type, Union
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import TYPE_MAPPING, \
    BASE_TYPE_MAPPING, HANDLER_TYPES
from superset.commands.database.uploaders.fields_uploader.handlers import StringHandler
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IFieldHandler

logger = logging.getLogger(__name__)


class TypeHandlerRegistry:
    """Реестр обработчиков типов данных"""

    def __init__(self):
        self._handlers: Dict[str, Type[IFieldHandler]] = {}
        self._handler_instances: Dict[str, IFieldHandler] = {}

    def register(self, type_name: Union[str, List[str]], handler_class: Type[IFieldHandler]):
        """Метод для регистрации обработчиков"""
        if isinstance(type_name, list):
            for t in type_name:
                self._handlers[t.upper()] = handler_class
        else:
            self._handlers[type_name.upper()] = handler_class
        return handler_class

    def _resolve_handler(self, type_name: str) -> IFieldHandler:
        """Метод для определения обработчика типа"""
        type_name_upper = type_name.upper()

        # 1. Приоритет: явно зарегистрированные обработчики
        if type_name_upper in self._handlers:
            if type_name_upper not in self._handler_instances:
                self._handler_instances[type_name_upper] = self._handlers[
                    type_name_upper]()
            return self._handler_instances[type_name_upper]

        # 2. Проверяем TYPE_MAPPING
        type_info = TYPE_MAPPING.get(type_name_upper)
        if type_info and 'handler' in type_info:
            handler_name = type_info['handler']
            if handler_name in HANDLER_TYPES:
                handler_type = HANDLER_TYPES[handler_name][0]
                if handler_type in self._handlers:
                    return self._handlers[handler_type]()

        # 3. Определяем базовую категорию типа
        base_type = self._get_base_type_category(type_name_upper)
        if base_type in BASE_TYPE_MAPPING:
            handler_name = BASE_TYPE_MAPPING[base_type].get('handler')
            if handler_name and handler_name in HANDLER_TYPES:
                handler_type = HANDLER_TYPES[handler_name][0]
                if handler_type in self._handlers:
                    return self._handlers[handler_type]()

        # 4. Fallback - обработчик строк
        return StringHandler()

    def _get_base_type_category(self, type_name: str) -> Optional[str]:
        """Определить базовую категорию типа"""
        type_name_upper = type_name.upper()

        if any(t in type_name_upper for t in ["INT", "SMALLINT", "BIGINT", "TINYINT"]):
            return "integer"
        elif any(t in type_name_upper for t in ["FLOAT", "DOUBLE", "REAL"]):
            return "float"
        elif any(t in type_name_upper for t in ["DECIMAL", "NUMERIC", "NUMBER"]):
            return "decimal"
        elif "DATE" in type_name_upper and "TIME" not in type_name_upper:
            return "date"
        elif "TIME" in type_name_upper and "DATE" not in type_name_upper:
            return "time"
        elif any(t in type_name_upper for t in ["DATETIME", "TIMESTAMP"]):
            return "datetime"
        elif any(t in type_name_upper for t in ["BOOLEAN", "BOOL", "BIT"]):
            return "boolean"
        return "string"

    @lru_cache(maxsize=32)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Основной метод получения обработчика"""
        return self._resolve_handler(type_name)

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""
        handler = self.get_handler_instance(type_name)
        if hasattr(handler, 'get_pandas_type'):
            return handler.get_pandas_type()

        type_name_upper = type_name.upper()
        if type_name_upper in TYPE_MAPPING:
            return TYPE_MAPPING[type_name_upper].get("pandas", "string")

        base_type = self._get_base_type_category(type_name_upper)
        if base_type in BASE_TYPE_MAPPING:
            return BASE_TYPE_MAPPING[base_type].get("pandas", "string")

        return "string"

    def handle_value(self, type_name: str, value: Any) -> Any:
        """Обработать значение с помощью соответствующего обработчика"""
        handler = self.get_handler_instance(type_name)
        try:
            return handler.handle(value)
        except Exception as e:
            logger.warning(
                f"Failed to handle value {value} with handler {handler.__class__.__name__}, falling back to string: {str(e)}")
            return str(value)


type_handler_registry = TypeHandlerRegistry()
