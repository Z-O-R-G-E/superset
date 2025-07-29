# registry.py
import logging
from functools import lru_cache
from importlib import import_module
from typing import Dict, Type

from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler
from superset.commands.database.uploaders.fields_uploader.type_config import TYPE_MAPPING

logger = logging.getLogger(__name__)


class TypeHandlerRegistry:
    """Реестр обработчиков типов данных."""

    def __init__(self):
        self._handler_cache: Dict[str, IFieldHandler] = {}
        self._handler_classes = self._discover_handler_classes()

    def _discover_handler_classes(self) -> Dict[str, Type[IFieldHandler]]:
        handler_classes = {}
        unique_handlers = {config["handler"] for config in TYPE_MAPPING.values()}

        try:
            handlers_module = import_module(
                "superset.commands.database.uploaders.fields_uploader.handlers"
            )

            for handler_name in unique_handlers:
                try:
                    handler_class = getattr(handlers_module, handler_name)
                    if issubclass(handler_class, IFieldHandler):
                        handler_classes[handler_name] = handler_class
                    else:
                        logger.warning(
                            f"Обработчик {handler_name} не реализует IFieldHandler"
                        )
                except AttributeError:
                    logger.error(f"Класс обработчика {handler_name} не найден")
        except ImportError as e:
            logger.error(f"Не удалось импортировать модуль обработчиков: {e}")
            raise

        return handler_classes

    @lru_cache(maxsize=256)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        type_name_upper = type_name.upper()

        if cached_handler := self._handler_cache.get(type_name_upper):
            return cached_handler

        type_info = TYPE_MAPPING.get(type_name_upper)
        if not type_info:
            logger.warning(f"Неизвестный тип '{type_name}', используется StringHandler")
            return self._get_default_handler()

        handler_class = self._handler_classes.get(type_info["handler"])
        if not handler_class:
            logger.warning(
                f"Обработчик '{type_info['handler']}' не найден, используется StringHandler"
            )
            return self._get_default_handler()

        handler_instance = handler_class()
        self._handler_cache[type_name_upper] = handler_instance
        return handler_instance

    def _get_default_handler(self) -> IFieldHandler:
        default_handler = self._handler_classes.get("StringHandler")
        if not default_handler:
            raise RuntimeError("StringHandler по умолчанию не найден")
        return default_handler()


type_handler_registry = TypeHandlerRegistry()
