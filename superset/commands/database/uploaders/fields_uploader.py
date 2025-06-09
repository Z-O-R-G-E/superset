import logging
from functools import partial
from typing import Any, Optional, TypedDict, List, Dict

import pandas as pd
from flask_babel import lazy_gettext as _

from superset import db
from superset.commands.base import BaseCommand
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseSchemaUploadNotAllowed,
    DatabaseUploadFailed,
    DatabaseUploadNotSupported,
    DatabaseUploadSaveMetadataFailed,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.sql_parse import Table
from superset.utils.core import get_user
from superset.utils.decorators import on_error, transaction
from superset.views.database.validators import schema_allows_file_upload

logger = logging.getLogger(__name__)

READ_CHUNK_SIZE = 1000

class FieldsMetadataItem(TypedDict):
    column_names: list[str]
    num_rows: Optional[int]
    num_columns: Optional[int]

class FieldsMetadata(TypedDict, total=False):
    items: list[FieldsMetadataItem]

class FieldsReaderOptions:
    index_column: str
    day_first: bool
    null_values: list[str]
    already_exists: str
    index_label: str
    dataframe_index: bool

class FieldsReader:
    def __init__(
        self,
        options: Optional[FieldsReaderOptions] = None,
    ) -> None:
        self._options = options or {}

    def read(
        self,
        fields: List[Dict[str, Any]],
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        self._dataframe_to_database(
            self.fields_to_dataframe(fields), database, table_name, schema_name
        )

    def _dataframe_to_database(
        self,
        df: pd.DataFrame,
        database: Database,
        table_name: str,
        schema_name: Optional[str],
    ) -> None:
        """
        Upload DataFrame to database

        :param df:
        :throws DatabaseUploadFailed: if there is an error uploading the DataFrame
        """
        try:
            data_table = Table(table=table_name, schema=schema_name)
            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": self._options.get("already_exists", "fail"),
                "index": self._options.get("dataframe_index", False),
            }
            if self._options.get("index_label") and self._options.get(
                "dataframe_index"
            ):
                to_sql_kwargs["index_label"] = self._options.get("index_label")
            database.db_engine_spec.df_to_sql(
                database,
                data_table,
                df,
                to_sql_kwargs=to_sql_kwargs,
            )
        except ValueError as ex:
            raise DatabaseUploadFailed(
                message=_(
                    "Table already exists. You can change your "
                    "'if table already exists' strategy to append or "
                    "replace or provide a different Table Name to use."
                )
            ) from ex
        except Exception as ex:
            raise DatabaseUploadFailed(exception=ex) from ex

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

class FieldsUploadCommand(BaseCommand):
    def __init__(  # pylint: disable=too-many-arguments
        self,
        model_id: int,
        table_name: str,
        upload_fields: Any,
        schema: Optional[str],
        reader: FieldsReader,
    ) -> None:
        self._model_id = model_id
        self._model: Optional[Database] = None
        self._table_name = table_name
        self._schema = schema
        self._fields = upload_fields
        self._reader = reader

    @transaction(on_error=partial(on_error, reraise=DatabaseUploadSaveMetadataFailed))
    def run(self) -> None:
        self.validate()
        if not self._model:
            return

        self._reader.read(self._fields, self._model, self._table_name, self._schema)

        sqla_table = (
            db.session.query(SqlaTable)
            .filter_by(
                table_name=self._table_name,
                schema=self._schema,
                database_id=self._model_id,
            )
            .one_or_none()
        )
        if not sqla_table:
            sqla_table = SqlaTable(
                table_name=self._table_name,
                database=self._model,
                database_id=self._model_id,
                owners=[get_user()],
                schema=self._schema,
            )
            db.session.add(sqla_table)

        sqla_table.fetch_metadata()

    def validate(self) -> None:
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()
        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()
        if not self._model.db_engine_spec.supports_file_upload:
            raise DatabaseUploadNotSupported()
