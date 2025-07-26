from superset.commands.database.uploaders.fields_uploader.constants import HANDLER_TYPES
from superset.commands.database.uploaders.fields_uploader.handlers import \
    IntegerHandler, FloatHandler, DecimalHandler, StringHandler, DateHandler, \
    TimeHandler, DateTimeHandler, DateTimeTzHandler, BooleanHandler
from superset.commands.database.uploaders.fields_uploader.registry import \
    type_handler_registry

# Регистрация обработчиков
type_handler_registry.register(HANDLER_TYPES["IntegerHandler"])(IntegerHandler)
type_handler_registry.register(HANDLER_TYPES["FloatHandler"])(FloatHandler)
type_handler_registry.register(HANDLER_TYPES["DecimalHandler"])(DecimalHandler)
type_handler_registry.register(HANDLER_TYPES["StringHandler"])(StringHandler)
type_handler_registry.register(HANDLER_TYPES["DateHandler"])(DateHandler)
type_handler_registry.register(HANDLER_TYPES["TimeHandler"])(TimeHandler)
type_handler_registry.register(HANDLER_TYPES["DateTimeHandler"])(DateTimeHandler)
type_handler_registry.register(HANDLER_TYPES["DateTimeTzHandler"])(DateTimeTzHandler)
type_handler_registry.register(HANDLER_TYPES["BooleanHandler"])(BooleanHandler)
