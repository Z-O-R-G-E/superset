# handlers.py
from datetime import timezone, time, datetime
from decimal import Decimal
from typing import Any, Dict, Optional
import sqlalchemy as sa
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler
from superset.commands.database.uploaders.fields_uploader.type_config import TYPE_CONFIG


class BaseHandler(IFieldHandler):
    """Базовый класс для обработчиков типов данных."""

    def __init__(self):
        self.type_config = TYPE_CONFIG.get(self.__class__.__name__.replace("Handler", "").lower())
        if not self.type_config:
            raise ValueError(f"Некорректный тип для обработчика: {self.__class__.__name__}")

    def get_pandas_type(self) -> str:
        """Возвращает соответствующий тип данных для pandas."""
        return self.type_config["pandas"]

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        """Возвращает тип данных, специфичный для указанной СУБД."""
        db_types = self.type_config["db_types"]
        specific_type = db_types.get(dbms, db_types.get("*", "TEXT"))

        if self.type_config == TYPE_CONFIG["decimal"] and "(" not in specific_type:
            precision = field.get("precision", 18)
            scale = field.get("scale", 4)
            return f"{specific_type}({precision},{scale})"

        if self.type_config == TYPE_CONFIG["string"] and (size := field.get("size")):
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "clickhouse":
                return f"FixedString({size})"

        return specific_type


class IntegerHandler(BaseHandler):
    """Обработчик для целочисленных типов."""

    def handle(self, value: Any) -> Optional[int]:
        if value is None:
            return None

        try:
            if isinstance(value, str):
                if '.' in value:
                    value = value.split('.')[0]
                value = ''.join(c for c in value if c.isdigit() or c == '-')
            return int(value)
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.BigInteger()


class FloatHandler(BaseHandler):
    """Обработчик для чисел с плавающей точкой."""

    def handle(self, value: Any) -> Optional[float]:
        try:
            return float(value) if value is not None else None
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))


class DecimalHandler(BaseHandler):
    """Обработчик для десятичных чисел."""

    def handle(self, value: Any) -> Optional[Decimal]:
        if value is None:
            return None

        try:
            str_value = str(value).strip().replace(" ", "").replace(",", ".")
            return Decimal(str_value)
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Numeric(
            precision=field.get("precision", 18),
            scale=field.get("scale", 4)
        )


class StringHandler(BaseHandler):
    """Обработчик для строковых типов."""

    def handle(self, value: Any) -> Optional[str]:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        return sa.VARCHAR(size) if size else sa.Text()


class DateTimeHandler(BaseHandler):
    """Обработчик для даты-времени."""

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        return pd.to_datetime(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()


class DateHandler(DateTimeHandler):
    """Обработчик для дат."""

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()


class TimeHandler(BaseHandler):
    """Обработчик для времени."""

    def handle(self, value: Any) -> Optional[time]:
        if value is None:
            return None

        try:
            if isinstance(value, time):
                return value
            if isinstance(value, datetime):
                return value.time()

            if isinstance(value, str):
                for fmt in ['%H:%M:%S.%f', '%H:%M:%S', '%H:%M']:
                    try:
                        return datetime.strptime(value, fmt).time()
                    except ValueError:
                        continue

            return pd.to_datetime(value).time()
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()


class DateTimeTzHandler(DateTimeHandler):
    """Обработчик для даты-времени с часовым поясом."""

    def handle(self, value: Any) -> Any:
        if value is None:
            return None

        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)


class BooleanHandler(BaseHandler):
    """Обработчик для булевых типов."""

    def handle(self, value: Any) -> Optional[bool]:
        if value is None:
            return None

        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes", "да")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()
