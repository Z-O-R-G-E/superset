import logging
from functools import lru_cache
from superset.commands.database.uploaders.fields_uploader.handlers import (
    IntegerHandler, FloatHandler, DecimalHandler, StringHandler,
    DateHandler, TimeHandler, DateTimeHandler, DateTimeTzHandler, BooleanHandler
)
from superset.commands.database.uploaders.fields_uploader.interfaces import \
    IFieldHandler
from superset.commands.database.uploaders.fields_uploader.type_config import \
    TYPE_MAPPING

logger = logging.getLogger(__name__)


class TypeHandlerRegistry:
    """Реестр только для управления обработчиками"""
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
        self._handler_cache = {}

    @lru_cache(maxsize=128)
    def get_handler_instance(self, type_name: str) -> IFieldHandler:
        type_name_upper = type_name.upper()

        if type_name_upper in self._handler_cache:
            return self._handler_cache[type_name_upper]

        type_info = TYPE_MAPPING.get(type_name_upper)
        handler_class = self._handler_classes.get(
            type_info['handler']) if type_info else None
        handler = handler_class() if handler_class else StringHandler()
        self._handler_cache[type_name_upper] = handler
        return handler


type_handler_registry = TypeHandlerRegistry()
