from datetime import timezone, time, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict
import sqlalchemy as sa
from dateutil.parser import isoparse
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import DBMS_CONFIG
from superset.commands.database.uploaders.fields_uploader.interfaces import IFieldHandler


class DefaultHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return str(value) if value is not None else None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Text()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("string", "TEXT")


class IntegerHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str) and '.' in value:
            value = value.split('.')[0]
        return int(float(value)) if isinstance(value, str) else int(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Integer()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("integer", "BIGINT")


class FloatHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return float(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Float(precision=field.get("precision", 24))

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("float", "DOUBLE")


class DecimalHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        str_value = str(value).strip().replace(" ", "").replace(",", "")
        decimal_value = Decimal(str_value)

        scale = 4
        if scale >= 0:
            return decimal_value.quantize(
                Decimal('0.' + '0' * scale),
                rounding=ROUND_HALF_UP
            )
        return decimal_value

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Numeric(
            precision=field.get("precision", 18),
            scale=field.get("scale", 4)
        )

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        base_type = DBMS_CONFIG.get(dbms, {}).get("decimal", "NUMERIC")
        precision = field.get("precision", 18)
        scale = field.get("scale", 4)

        if dbms == "oracle":
            return f"NUMBER({precision},{scale})"
        elif dbms == "mssql":
            return f"DECIMAL({precision},{scale})"
        elif dbms == "mysql":
            return f"DECIMAL({precision},{scale})"
        return base_type


class StringHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return str(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        size = field.get("size")
        if size:
            return sa.VARCHAR(size)
        return sa.Text()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        size = field.get("size")
        base_type = DBMS_CONFIG.get(dbms, {}).get("string", "TEXT")

        if size and dbms in ["postgresql", "mysql", "oracle", "mssql"]:
            if dbms == "postgresql":
                return f"VARCHAR({size})"
            elif dbms == "mysql":
                return f"VARCHAR({size})"
            elif dbms == "oracle":
                return f"VARCHAR2({size})"
            elif dbms == "mssql":
                return f"NVARCHAR({size})"
        return base_type


class DateHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value).date()

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Date()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("date", "DATE")


class TimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, time):
            return value

        if isinstance(value, datetime):
            return value.time()

        if isinstance(value, str):
            formats = [
                '%H:%M:%S.%f',
                '%H:%M:%S',
                '%H:%M',
                '%I:%M:%S %p',
                '%I:%M %p'
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt).time()
                except ValueError:
                    continue

            try:
                return isoparse(value).time()
            except ValueError:
                pass

        try:
            dt = pd.to_datetime(value, errors='raise')
            if isinstance(dt, pd.Timestamp):
                return dt.to_pydatetime().time()
            return dt.time()
        except (ValueError, TypeError):
            return None

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Time()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("time", "TIME")


class DateTimeHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        return pd.to_datetime(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("datetime", "TIMESTAMP")


class DateTimeTzHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        dt = pd.to_datetime(value)
        return dt.tz_localize(timezone.utc) if dt.tzinfo is None else dt

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.DateTime(timezone=True)

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        if dbms == "postgresql":
            return "TIMESTAMP WITH TIME ZONE"
        elif dbms == "oracle":
            return "TIMESTAMP WITH TIME ZONE"
        return DBMS_CONFIG.get(dbms, {}).get("datetime", "TIMESTAMP")


class BooleanHandler(IFieldHandler):
    def handle(self, value: Any) -> Any:
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value)

    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        return sa.Boolean()

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        return DBMS_CONFIG.get(dbms, {}).get("boolean", "BOOLEAN")
