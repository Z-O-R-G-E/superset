import logging
from functools import lru_cache
from typing import Dict
from superset.commands.database.uploaders.fields_uploader.constants import (
    TYPE_MAPPING, HANDLER_TYPES
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

    _handler_classes = {
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

    def __init__(self):
        self._handler_instances: Dict[str, IFieldHandler] = {}
        self._init_handlers_from_constants()

    def _init_handlers_from_constants(self):
        for handler_name, type_names in HANDLER_TYPES.items():
            handler_class = self._handler_classes.get(handler_name)
            if handler_class:
                for type_name in type_names:
                    self._handler_instances[type_name] = handler_class()

    @lru_cache(maxsize=128)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Получить обработчик для типа данных"""
        type_name_upper = type_name.upper()

        # 1. Проверка зарегистрированных обработчиков
        if type_name_upper in self._handler_instances:
            return self._handler_instances[type_name_upper]

        # 2. Проверка TYPE_MAPPING
        type_info = TYPE_MAPPING.get(type_name_upper)
        if type_info and 'handler' in type_info:
            handler_class = self._handler_classes.get(type_info['handler'])
            if handler_class:
                return handler_class()

        # 3. Fallback
        return StringHandler()

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""
        type_info = TYPE_MAPPING.get(type_name.upper(), {})
        return type_info.get("pandas", "string")


type_handler_registry = TypeHandlerRegistry()
