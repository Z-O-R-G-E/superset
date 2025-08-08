import pandas as pd

from abc import abstractmethod
from datetime import timezone, time, datetime
from decimal import Decimal
from typing import Any, Dict, Optional, List

from superset.commands.database.uploaders.fields_uploader.config import TYPE_CONFIG
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler

class BaseHandler(IFieldHandler):
    """Базовый класс для обработчиков типов данных."""

    def __init__(self):
        handler_name = self.__class__.__name__.replace("Handler", "").lower()
        self.type_config = TYPE_CONFIG.get(handler_name)
        if not self.type_config:
            raise ValueError(f"Некорректный тип для обработчика: {self.__class__.__name__}")

    @abstractmethod
    def handle(self, value: Any, null_values: List[str]) -> Any:
        """Абстрактный метод обработки значения поля."""
        pass

    @staticmethod
    def _is_null(value: Any, null_values: List[str]) -> bool:
        """Проверить, является ли значение NULL"""
        if value is None:
            return True

        if isinstance(value, str):
            return value.lower() in {v.lower() for v in null_values}

        return str(value).lower() in {v.lower() for v in null_values}

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        field_type = field.get("type", "").upper()
        db_types = self.type_config["db_types"]
        db_specific = db_types.get(dbms, db_types.get("*"))

        if isinstance(db_specific, dict):
            db_type = db_specific.get(field_type, db_specific.get("*"))
            if not db_type:
                raise ValueError(f"Не найден тип для {field_type} в {dbms}")
            return db_type.format(**field) if isinstance(db_type, str) else str(db_type)

        return db_specific.format(**field) if isinstance(db_specific, str) else str(db_specific)


class IntegerHandler(BaseHandler):
    """Обработчик для целочисленных типов."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[int]:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                if '.' in value:
                    value = value.split('.')[0]
                value = ''.join(c for c in value if c.isdigit() or c == '-')
            return int(value)
        except (ValueError, TypeError):
            return None


class FloatHandler(BaseHandler):
    """Обработчик для чисел с плавающей точкой."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[float]:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                return float(value)
        except (ValueError, TypeError):
            return None


class DecimalHandler(BaseHandler):
    """Обработчик для десятичных чисел."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[Decimal]:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                str_value = str(value).strip().replace(" ", "").replace(",", ".")
                return Decimal(str_value)
        except (ValueError, TypeError):
            return None

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = super().get_dbms_specific_type(field, dbms)
        if "(" not in base_type:
            precision = field.get("precision", self.type_config.get("default_precision", 18))
            scale = field.get("scale", self.type_config.get("default_scale", 4))
            return f"{base_type}({precision},{scale})"
        return base_type


class StringHandler(BaseHandler):
    """Обработчик для строковых типов."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[str]:
        if self._is_null(value, null_values):
            return None

        return str(value)

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = super().get_dbms_specific_type(field, dbms)
        size = field.get("size")
        if size and "{size}" in base_type:
            return base_type.format(size=size)
        return base_type


class DateTimeHandler(BaseHandler):
    """Обработчик для даты-времени."""

    def handle(self, value: Any, null_values: List[str]) -> Any:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                return pd.to_datetime(value)
        except (ValueError, TypeError):
            return None


class DateHandler(DateTimeHandler):
    """Обработчик для дат."""

    def handle(self, value: Any, null_values: List[str]) -> Any:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                return pd.to_datetime(value).date()
        except (ValueError, TypeError):
            return None


class TimeHandler(BaseHandler):
    """Обработчик для времени."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[time]:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, time):
                return value
            if isinstance(value, datetime):
                return value.time()

            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                for fmt in ['%H:%M:%S.%f', '%H:%M:%S', '%H:%M']:
                    try:
                        return datetime.strptime(value, fmt).time()
                    except ValueError:
                        continue

            return pd.to_datetime(value).time()
        except (ValueError, TypeError):
            return None


class DateTimeTzHandler(DateTimeHandler):
    """Обработчик для даты-времени с часовым поясом."""

    def handle(self, value: Any, null_values: List[str]) -> Any:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                dt = pd.to_datetime(value)
                return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt
        except (ValueError, TypeError):
            return None


class BooleanHandler(BaseHandler):
    """Обработчик для булевых типов."""

    def handle(self, value: Any, null_values: List[str]) -> Optional[bool]:
        if self._is_null(value, null_values):
            return None

        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                if isinstance(value, str):
                    return value.lower() in ("true", "1", "t", "y", "yes", "да")
        except (ValueError, TypeError):
            return None
