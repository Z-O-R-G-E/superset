from datetime import timezone, time, datetime
from decimal import Decimal
from typing import Any, Dict
import sqlalchemy as sa
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import DBMS_CONFIG
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler

class IntegerHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("integer", "BIGINT")

    def get_pandas_type(self) -> str:
        return "Int64"

class FloatHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return float(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("float", "DOUBLE PRECISION")

    def get_pandas_type(self) -> str:
        return "float64"

class DecimalHandler(IFieldHandler):
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
        base_type = DBMS_CONFIG.get(dbms, {}).get("decimal", "NUMERIC")
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)
        return f"{base_type}({precision},{scale})" if "(" not in base_type else base_type

    def get_pandas_type(self) -> str:
        return "object"

class StringHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        return sa.VARCHAR(size) if size else sa.Text()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        size = field.get("size")
        base_type = DBMS_CONFIG.get(dbms, {}).get("string", "TEXT")
        if size:
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "clickhouse":
                return f"FixedString({size})"
        return base_type

    def get_pandas_type(self) -> str:
        return "string"

class DateHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("date", "DATE")

    def get_pandas_type(self) -> str:
        return "datetime64[ns]"

class TimeHandler(IFieldHandler):
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

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("time", "TIME")

    def get_pandas_type(self) -> str:
        return "object"

class DateTimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("datetime", "TIMESTAMP")

    def get_pandas_type(self) -> str:
        return "datetime64[ns]"

class DateTimeTzHandler(IFieldHandler):
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

class BooleanHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("boolean", "BOOLEAN")

    def get_pandas_type(self) -> str:
        return "boolean"
