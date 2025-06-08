import logging
from typing import Any, Optional, List, Dict
import pandas as pd
from flask_babel import lazy_gettext as _

from superset.commands.database.exceptions import DatabaseUploadFailed
from superset.commands.database.uploaders.base import (
    BaseDataReader,
    FieldsMetadata,
    ReaderOptions,
)

logger = logging.getLogger(__name__)


class FieldsReaderOptions(ReaderOptions, total=False):
    index_column: str
    day_first: bool
    null_values: list[str]


class FieldsReader(BaseDataReader):
    def __init__(
        self,
        options: Optional[FieldsReaderOptions] = None,
    ) -> None:
        options = options or {}
        super().__init__(
            options=dict(options),
        )

    @staticmethod
    def _convert_value(field: Dict[str, Any]) -> Any:
        value = field.get("value")
        field_type = field["type"].upper()

        if value is None:
            return None

        try:
            if field_type in ("TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT"):
                return int(value)
            elif field_type in (
            "FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL", "BINARY_FLOAT",
            "BINARY_DOUBLE"):
                return float(value)
            elif field_type in ("DECIMAL", "NUMERIC", "NUMBER"):
                precision = field.get("precision", 10)
                scale = field.get("scale", 2)
                return round(float(value), scale)
            elif field_type in ("CHAR", "VARCHAR", "TEXT", "NCHAR", "NVARCHAR", "CLOB",
                                "LONGTEXT", "FIXEDSTRING", "STRING", "JSON", "JSONB",
                                "XML"):
                size = field.get("size")
                return str(value)[:size] if size else str(value)
            elif field_type in ("BOOLEAN", "BIT", "BOOL"):
                return bool(value)
            elif field_type == "ENUM":
                enum_values = field.get("enum_values", [])
                if value not in enum_values:
                    raise ValueError(
                        f"Значение '{value}' недопустимо. Допустимые значения: {enum_values}")
                return value
            else:
                return value
        except Exception as ex:
            raise ValueError(
                f"Не удалось преобразовать значение '{value}' в тип {field_type}: {str(ex)}")

    @staticmethod
    def _read_fields(fields: List[Dict[str, Any]],
                     kwargs: dict[str, Any]) -> pd.DataFrame:
        try:
            data = {}
            dtypes = {}

            for field in fields:
                name = field["name"]
                field_type = field["type"].upper()
                is_required = field.get("is_required", False)

                try:
                    value = FieldsReader._convert_value(field)
                except Exception as ex:
                    if not is_required:
                        value = None
                    else:
                        raise

                data[name] = [value]

                if field_type in ("TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT"):
                    dtypes[name] = "int64"
                elif field_type in ("FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL",
                                    "BINARY_FLOAT", "BINARY_DOUBLE", "DECIMAL",
                                    "NUMERIC", "NUMBER"):
                    dtypes[name] = "float64"
                elif field_type == "BOOLEAN":
                    dtypes[name] = "bool"
                else:
                    dtypes[name] = "object"

            df = pd.DataFrame(data)

            for col, dtype in dtypes.items():
                try:
                    df[col] = df[col].astype(dtype)
                except Exception:
                    pass

            if kwargs.get("index_col"):
                df.set_index(kwargs["index_col"], inplace=True)
                if kwargs.get("index_label"):
                    df.index.name = kwargs["index_label"]

            return df

        except (
            pd.errors.ParserError,
            pd.errors.EmptyDataError,
            UnicodeDecodeError,
            ValueError,
        ) as ex:
            raise DatabaseUploadFailed(
                message=_("Ошибка парсинга: %(error)s", error=str(ex))
            ) from ex
        except Exception as ex:
            raise DatabaseUploadFailed(
                _("Не удалось создать DataFrame на основе предоставленных полей")) from ex

    def fields_to_dataframe(self, fields: List[Dict[str, Any]]) -> pd.DataFrame:
        kwargs = {
            "index_col": self._options.get("index_column"),
            "dayfirst": self._options.get("day_first", False),
            "keep_default_na": not self._options.get("null_values"),
            "na_values": self._options.get("null_values")
            if self._options.get("null_values")
            else None,
        }
        return self._read_fields(fields, kwargs)

    def fields_metadata(self, fields: List[Dict[str, Any]]) -> FieldsMetadata:
        df = self.fields_to_dataframe(fields)
        return {
            "items": [
                {
                    "column_names": list(df.columns),
                    "num_rows": len(df),
                    "num_columns": len(df.columns),
                }
            ]
        }
