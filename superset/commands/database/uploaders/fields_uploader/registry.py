import logging
from functools import lru_cache
from typing import List, Dict, Type, Union
from superset.commands.database.uploaders.fields_uploader.constants import (
    TYPE_MAPPING, BASE_TYPE_MAPPING, HANDLER_TYPES
)
from superset.commands.database.uploaders.fields_uploader.handlers import (
    IntegerHandler, FloatHandler, DecimalHandler, StringHandler,
    DateHandler, TimeHandler, DateTimeHandler, DateTimeTzHandler, BooleanHandler
)
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IFieldHandler

logger = logging.getLogger(__name__)


class TypeHandlerRegistry:
    """Реестр обработчиков типов данных"""

    def __init__(self):
        self._handlers: Dict[str, Type[IFieldHandler]] = {}
        self._handler_instances: Dict[str, IFieldHandler] = {}
        self._init_default_handlers()

    def _init_default_handlers(self):
        handler_map = {
            "IntegerHandler": IntegerHandler,
            "FloatHandler": FloatHandler,
            "DecimalHandler": DecimalHandler,
            "StringHandler": StringHandler,
            "DateHandler": DateHandler,
            "TimeHandler": TimeHandler,
            "DateTimeHandler": DateTimeHandler,
            "DateTimeTzHandler": DateTimeTzHandler,
            "BooleanHandler": BooleanHandler,
        }

        for handler_name, handler_class in handler_map.items():
            if handler_name in HANDLER_TYPES:
                for type_name in HANDLER_TYPES[handler_name]:
                    self.register(type_name, handler_class)

    def register(self, type_name: Union[str, List[str]],
                 handler_class: Type[IFieldHandler]):
        """Метод для регистрации обработчиков"""
        if isinstance(type_name, list):
            for t in type_name:
                self._handlers[t.upper()] = handler_class
        else:
            self._handlers[type_name.upper()] = handler_class
        return handler_class

    @lru_cache(maxsize=128)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Основной метод получения обработчика"""
        type_name_upper = type_name.upper()

        # 1. Проверка явно зарегистрированных обработчиков
        if type_name_upper in self._handlers:
            if type_name_upper not in self._handler_instances:
                self._handler_instances[type_name_upper] = self._handlers[
                    type_name_upper]()
            return self._handler_instances[type_name_upper]

        # 2. Проверка TYPE_MAPPING
        type_info = TYPE_MAPPING.get(type_name_upper)
        if type_info and 'handler' in type_info:
            handler_name = type_info['handler']
            handler_class = globals().get(handler_name)
            if handler_class:
                return self._get_handler_by_class(handler_class)

        # 3. Определение базового типа
        base_type = self._get_base_type_category(type_name_upper)
        if base_type in BASE_TYPE_MAPPING:
            handler_name = BASE_TYPE_MAPPING[base_type]['handler']
            handler_class = globals().get(handler_name)
            if handler_class:
                return self._get_handler_by_class(handler_class)

        # 4. Fallback
        return StringHandler()

    def _get_handler_by_class(self,
                              handler_class: Type[IFieldHandler]) -> IFieldHandler:
        class_name = handler_class.__name__
        if class_name not in self._handler_instances:
            self._handler_instances[class_name] = handler_class()
        return self._handler_instances[class_name]

    def _get_base_type_category(self, type_name: str) -> str:
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

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""
        type_name_upper = type_name.upper()

        if type_name_upper in TYPE_MAPPING:
            return TYPE_MAPPING[type_name_upper].get("pandas", "string")

        base_type = self._get_base_type_category(type_name_upper)
        if base_type in BASE_TYPE_MAPPING:
            return BASE_TYPE_MAPPING[base_type].get("pandas", "string")

        return "string"


type_handler_registry = TypeHandlerRegistry()
