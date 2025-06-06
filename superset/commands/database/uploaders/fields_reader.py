import logging
from typing import Any, Optional, List, Dict

import pandas as pd
from flask_babel import lazy_gettext as _

from superset.commands.database.exceptions import DatabaseUploadFailed
from superset.commands.database.uploaders.base import (
    BaseDataReader,
    FileMetadata,
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
    def _read_fields(fields: List[Dict[str, Any]], kwargs: dict[str, Any]) -> pd.DataFrame:
        try:
            return
        except (
            pd.errors.ParserError,
            pd.errors.EmptyDataError,
            UnicodeDecodeError,
            ValueError,
        ) as ex:
            raise DatabaseUploadFailed(
                message=_("Parsing error: %(error)s", error=str(ex))
            ) from ex
        except Exception as ex:
            raise DatabaseUploadFailed(_("Error reading CSV file")) from ex

    def fields_to_dataframe(self, fields: List[Dict[str, Any]]) -> pd.DataFrame:
        kwargs = {
            "index_col": self._options.get("index_column"),
            "dayfirst": self._options.get("day_first", False),
            "keep_default_na": not self._options.get("null_values"),
            "na_values": self._options.get("null_values")
            if self._options.get("null_values")  # None if an empty list
            else None,
        }
        return self._read_fields(fields, kwargs)

    def fields_metadata(self, fields: List[Dict[str, Any]]) -> FileMetadata:
        kwargs = {}
        df = self._read_fields(fields, kwargs)
        return {}
