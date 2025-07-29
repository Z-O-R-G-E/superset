from datetime import timezone, time, datetime
from decimal import Decimal
from typing import Any, Dict
import sqlalchemy as sa
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler
from superset.commands.database.uploaders.fields_uploader.type_config import TYPE_CONFIG


class BaseHandler(IFieldHandler):
    def __init__(self, type_name: str):
        self.type_name = type_name
        self.type_config = TYPE_CONFIG.get(type_name, TYPE_CONFIG["string"])

    def get_pandas_type(self) -> str:
        return self.type_config["pandas"]

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        db_types = self.type_config["db_types"]
        specific_type = db_types.get(dbms, db_types.get("*", "TEXT"))

        if self.type_name == "decimal" and "(" not in specific_type:
            precision = field.get("precision", 18)
            scale = field.get("scale", 4)
            return f"{specific_type}({precision},{scale})"

        if self.type_name == "string" and (size := field.get("size")):
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "clickhouse":
                return f"FixedString({size})"

        return specific_type


class NumericHandler(BaseHandler):
    def __init__(self, type_name: str, sqlalchemy_type):
        super().__init__(type_name)
        self.sqlalchemy_type = sqlalchemy_type

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return self.sqlalchemy_type


class IntegerHandler(NumericHandler):
    def __init__(self):
        super().__init__("integer", sa.Integer())

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)


class FloatHandler(NumericHandler):
    def __init__(self):
        super().__init__("float", sa.Float())

    def handle(self, value: Any) -> Any:
        return float(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))


class DecimalHandler(NumericHandler):
    def __init__(self):
        super().__init__("decimal", sa.Numeric())

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


class StringHandler(BaseHandler):
    def __init__(self):
        super().__init__("string")

    def handle(self, value: Any) -> Any:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        return sa.VARCHAR(size) if size else sa.Text()


class DateTimeHandler(BaseHandler):
    def __init__(self, type_name: str = "datetime"):
        super().__init__(type_name)

    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()


class DateHandler(DateTimeHandler):
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


class DateTimeTzHandler(DateTimeHandler):
    def __init__(self):
        super().__init__("datetimetz")

    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)


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
