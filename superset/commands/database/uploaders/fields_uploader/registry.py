from functools import lru_cache
from typing import List, Dict, Type, Union
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import TYPE_MAPPING
from superset.commands.database.uploaders.fields_uploader.handlers import DefaultHandler
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IFieldHandler


class TypeHandlerRegistry:
    """Реестр обработчиков типов данных"""

    def __init__(self):
        self._handlers: Dict[str, Type[IFieldHandler]] = {}
        self._handler_instances: Dict[str, IFieldHandler] = {}

    def register(self, type_name: Union[str, List[str]]):
        """Декоратор для регистрации обработчиков"""

        def decorator(handler_class: Type[IFieldHandler]):
            if isinstance(type_name, list):
                for t in type_name:
                    self._handlers[t.upper()] = handler_class
            else:
                self._handlers[type_name.upper()] = handler_class
            return handler_class

        return decorator

    def get_pandas_type(self, type_name: str) -> str:
        """Получить тип pandas для указанного типа"""
        mapping = TYPE_MAPPING.get(type_name.upper(), {})
        return mapping.get("pandas", "string")

    @lru_cache(maxsize=32)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        """Получить экземпляр обработчика для типа"""
        handler_class = self._handlers.get(type_name.upper())
        if not handler_class:
            return DefaultHandler()
        if type_name not in self._handler_instances:
            self._handler_instances[type_name] = handler_class()
        return self._handler_instances[type_name]


type_handler_registry = TypeHandlerRegistry()
