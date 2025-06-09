import logging
from decimal import Decimal, InvalidOperation
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
    column_names: List[str]
    num_rows: Optional[int]
    num_columns: Optional[int]


class FieldsMetadata(TypedDict, total=False):
    items: List[FieldsMetadataItem]


class FieldsReaderOptions(TypedDict, total=False):
    index_column: str
    day_first: bool
    null_values: List[str]
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
        if not fields:
            raise DatabaseUploadFailed(message=_("Отсутствуют поля для загрузки"))

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
        Загружает DataFrame в базу данных

        :param df: DataFrame для загрузки
        :param database: Целевая база данных
        :param table_name: Имя целевой таблицы
        :param schema_name: Имя целевой схемы
        """
        try:
            if df.empty:
                raise DatabaseUploadFailed(
                    message=_("Загрузка пустого DataFrame невозможна"))

            data_table = Table(table=table_name, schema=schema_name)
            to_sql_kwargs = {
                "chunksize": READ_CHUNK_SIZE,
                "if_exists": self._options.get("already_exists", "fail"),
                "index": self._options.get("dataframe_index", False),
            }

            index_label = self._options.get("index_label")
            if index_label and self._options.get("dataframe_index"):
                to_sql_kwargs["index_label"] = index_label

            database.db_engine_spec.df_to_sql(
                database,
                data_table,
                df,
                to_sql_kwargs=to_sql_kwargs,
            )
        except ValueError as ex:
            raise DatabaseUploadFailed(
                message=_(
                    "Таблица уже существует. Измените стратегию обработки существующих таблиц "
                    "на 'append' (добавление) или 'replace' (замена), либо укажите другое имя таблицы."
                )
            ) from ex
        except Exception as ex:
            logger.exception("Не удалось загрузить DataFrame в базу данных")
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

                if not isinstance(precision, int) or precision <= 0:
                    raise ValueError("Точность должна быть положительным целым числом.")
                if not isinstance(scale, int) or scale < 0:
                    raise ValueError("Масштаб должен быть неотрицательным целым числом.")
                if scale > precision:
                    raise ValueError(f"Масштаб ({scale}) > точность ({precision})")

                try:
                    decimal_value = Decimal(str(value))
                    if len(str(decimal_value).split('.')[0].replace('-', '')) > (
                        precision - scale):
                        raise ValueError(
                            f"Целая часть слишком велика для точности {precision}")

                    rounded = round(decimal_value, scale)
                    return float(rounded)
                except (ValueError, InvalidOperation) as ex:
                    raise ValueError(
                        f"Не удалось преобразовать {value} в {field_type}({precision},{scale}): {str(ex)}"
                    )
            elif field_type in ("CHAR", "VARCHAR", "TEXT", "NCHAR", "NVARCHAR", "CLOB",
                                "LONGTEXT", "FIXEDSTRING", "STRING", "JSON", "JSONB",
                                "XML"):
                size = field.get("size")
                return str(value)[:size] if size else str(value)
            elif field_type in ("BOOLEAN", "BIT", "BOOL"):
                if isinstance(value, str):
                    return value.lower() in ("true", "1", "t", "y", "yes")
                return bool(value)
            elif field_type == "ENUM":
                enum_values = field.get("enum_values", [])
                if value not in enum_values:
                    raise ValueError(
                        f"Указано недопустимое значение '{value}'. "
                        f"Допустимые значения: {enum_values}")
                return value
            elif field_type in ("DATE", "TIME", "DATETIME", "TIMESTAMP"):
                return pd.to_datetime(value)
            else:
                return value
        except Exception as ex:
            raise ValueError(
                f"Не удалось преобразовать значение '{value}' к типу {field_type}: {str(ex)}")

    @staticmethod
    def _read_fields(
        fields: List[Dict[str, Any]],
        kwargs: Dict[str, Any]
    ) -> pd.DataFrame:
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
                        raise DatabaseUploadFailed(
                            message=_("Ошибка преобразования поля %(name)s: %(error)s",
                                      name=name, error=str(ex)))

                data[name] = [value]

                if field_type in ("TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT"):
                    dtypes[name] = "Int64"
                elif field_type in ("FLOAT", "FLOAT32", "FLOAT64", "DOUBLE", "REAL",
                                    "BINARY_FLOAT", "BINARY_DOUBLE", "DECIMAL",
                                    "NUMERIC", "NUMBER"):
                    dtypes[name] = "float64"
                elif field_type == "BOOLEAN":
                    dtypes[name] = "boolean"
                elif field_type in ("DATE", "TIME", "DATETIME", "TIMESTAMP"):
                    dtypes[name] = "datetime64[ns]"
                else:
                    dtypes[name] = "string"

            df = pd.DataFrame(data)

            for col, dtype in dtypes.items():
                try:
                    df[col] = df[col].astype(dtype)
                except Exception as ex:
                    logger.warning("Ошибка преобразования столбца %s в тип %s: %s",
                                   col, dtype, str(ex))

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
            logger.exception("Ошибка создания DataFrame из полей")
            raise DatabaseUploadFailed(
                _("Не удалось создать DataFrame из указанных полей")) from ex

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
        try:
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
        except Exception as ex:
            logger.exception("Не удалось сгенерировать метаданные полей")
            return {"items": []}


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

        try:
            self._reader.read(self._fields, self._model, self._table_name, self._schema)
        except Exception as ex:
            logger.exception("Ошибка загрузки полей в базу данных")
            raise

        self._create_or_update_sqla_table()

    def _create_or_update_sqla_table(self) -> None:
        """Создание или обновление метаданных SqlaTable"""
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

        try:
            sqla_table.fetch_metadata()
            db.session.commit()
        except Exception as ex:
            db.session.rollback()
            logger.exception("Не удалось сохранить метаданные таблицы")
            raise DatabaseUploadSaveMetadataFailed() from ex

    def validate(self) -> None:
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()

        if not self._table_name:
            raise DatabaseUploadFailed(message=_("Необходимо указать имя таблицы"))

        if not schema_allows_file_upload(self._model, self._schema):
            raise DatabaseSchemaUploadNotAllowed()

        if not isinstance(self._fields, list) or len(self._fields) == 0:
            raise DatabaseUploadFailed(message=_("Не указаны поля для загрузки"))
