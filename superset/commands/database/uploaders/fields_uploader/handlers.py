from datetime import timezone, time, datetime
from decimal import Decimal
from typing import Any, Dict
import sqlalchemy as sa
import pandas as pd
from abc import abstractmethod
from superset.commands.database.uploaders.fields_uploader.constants import (
    DBMS_CONFIG, BASE_TYPE_MAPPING
)
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler


class BaseHandler(IFieldHandler):
    def __init__(self, type_name: str):
        self.type_name = type_name
        self.type_info = BASE_TYPE_MAPPING.get(type_name, {})

    @abstractmethod
    def handle(self, value: Any) -> Any:
        pass

    @abstractmethod
    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        pass

    def get_pandas_type(self) -> str:
        return self.type_info.get("pandas", "string")

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get(self.type_name, DBMS_CONFIG.get(dbms, {}).get("default", "TEXT"))


class IntegerHandler(BaseHandler):
    def __init__(self):
        super().__init__("integer")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()


class FloatHandler(BaseHandler):
    def __init__(self):
        super().__init__("float")

    def handle(self, value: Any) -> Any:
        return float(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))


class DecimalHandler(BaseHandler):
    def __init__(self):
        super().__init__("decimal")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        str_value = str(value).strip().replace(" ", "").replace(",", ".")
        return Decimal(str_value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Numeric(
            precision=field.get("precision", 18),
            scale=field.get("scale", 4)
        )

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = super().get_dbms_specific_type(field, dbms)
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)
        return f"{base_type}({precision},{scale})" if "(" not in base_type else base_type


class StringHandler(BaseHandler):
    def __init__(self):
        super().__init__("string")

    def handle(self, value: Any) -> Any:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        return sa.VARCHAR(size) if size else sa.Text()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        size = field.get("size")
        base_type = super().get_dbms_specific_type(field, dbms)
        if size:
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "clickhouse":
                return f"FixedString({size})"
        return base_type


class DateHandler(BaseHandler):
    def __init__(self):
        super().__init__("date")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()


class TimeHandler(BaseHandler):
    def __init__(self):
        super().__init__("time")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
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

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()

    def get_pandas_type(self) -> str:
        return "object"


class DateTimeHandler(BaseHandler):
    def __init__(self):
        super().__init__("datetime")

    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()


class DateTimeTzHandler(DateTimeHandler):
    def __init__(self):
        super().__init__()

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        if dbms == "postgresql":
            return "TIMESTAMP WITH TIME ZONE"
        return "TIMESTAMP"

    def get_pandas_type(self) -> str:
        return "datetime64[ns, UTC]"


class BooleanHandler(BaseHandler):
    def __init__(self):
        super().__init__("boolean")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()
