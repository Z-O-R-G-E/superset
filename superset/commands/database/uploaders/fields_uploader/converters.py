import logging
from typing import Any, List, Dict
import sqlalchemy as sa
import pandas as pd
from flask_babel import lazy_gettext as _
from superset.commands.database.exceptions import DatabaseUploadFailed
from superset.commands.database.uploaders.fields_uploader.interfaces import IDataFrameConverter
from superset.commands.database.uploaders.fields_uploader.registry import TypeHandlerRegistry
from superset.commands.database.uploaders.fields_uploader.utils import NullChecker

logger = logging.getLogger(__name__)

class DataFrameConverter(IDataFrameConverter):
    def __init__(self, type_handler_registry: TypeHandlerRegistry):
        self.type_handler_registry = type_handler_registry

    def convert_to_dataframe(
            self,
            fields: List[Dict[str, Any]],
            options: Dict[str, Any]
    ) -> pd.DataFrame:
        """Преобразовать поля в DataFrame"""
        self._validate_fields(fields)
        null_checker = NullChecker(options.get("null_values"))
        data, dtypes = self._process_fields(fields, null_checker)

        if not data:
            raise DatabaseUploadFailed(_("Нет допустимых полей для загрузки"))

        df = pd.DataFrame(data)
        self._apply_dtypes(df, dtypes)
        self._process_index(df, options)
        return df

    def _validate_fields(self, fields: List[Dict[str, Any]]) -> None:
        """Валидация входных полей"""
        if not fields:
            raise DatabaseUploadFailed(_("Нет полей для загрузки"))
        if not all(isinstance(field, dict) for field in fields):
            raise DatabaseUploadFailed(_("Все поля должны быть словарями"))

    def _process_fields(
            self,
            fields: List[Dict[str, Any]],
            null_checker: NullChecker
    ) -> tuple[Dict[str, List[Any]], Dict[str, str]]:
        """Обработать поля и преобразовать в данные"""
        data = {}
        dtypes = {}

        for field in fields:
            name = field.get("name")
            if not name or not isinstance(name, str):
                continue

            field_type = (field.get("type", "") or "").strip()
            handler = self.type_handler_registry.get_handler_instance(field_type)
            value = field.get("value")

            try:
                processed_value = null_checker.process_value(value, field_type)
                if processed_value is not None:
                    processed_value = handler.handle(processed_value)

                data[name] = [processed_value]
                dtypes[name] = self.type_handler_registry.get_pandas_type(field_type)
            except Exception as ex:
                logger.warning(
                    "Ошибка обработки поля %s: %s. Используется строковый тип.",
                    name, str(ex))
                data[name] = [str(value) if value is not None else None]
                dtypes[name] = "string"

        return data, dtypes

    def _apply_dtypes(self, df: pd.DataFrame, dtypes: Dict[str, str]) -> None:
        """Применить типы данных к DataFrame"""
        for col, dtype in dtypes.items():
            try:
                if dtype.startswith("datetime64"):
                    df[col] = pd.to_datetime(df[col])
                else:
                    df[col] = df[col].astype(dtype, errors="ignore")
            except Exception as ex:
                logger.warning(
                    "Ошибка преобразования столбца %s к типу %s: %s",
                    col, dtype, str(ex))

    def _process_index(self, df: pd.DataFrame, options: Dict[str, Any]) -> None:
        """Обработать индекс DataFrame"""
        index_col = options.get("index_column")
        use_index = options.get("dataframe_index", False)
        index_label = options.get("index_label")
        already_exists = options.get("already_exists", "fail")

        if isinstance(index_label, str) and index_label.lower() == "undefined":
            index_label = None

        if not use_index:
            if index_col and index_col in df.columns:
                df.set_index(index_col, inplace=True)
                if index_label:
                    df.index.name = index_label
            return

        final_index_label = (
            index_label if index_label and index_label != '' else
            index_col if index_col and index_col != '' else
            "id"
        )

        if not index_col or index_col == '':
            offset = self._get_existing_rows_count(
                options) if already_exists == "append" else 0
            df.index = pd.RangeIndex(start=offset, stop=offset + len(df))
            df.index.name = final_index_label
        else:
            if index_col in df.columns:
                df.set_index(index_col, inplace=True)
                df.index.name = final_index_label if final_index_label else index_col

        if final_index_label:
            options["index_label"] = final_index_label

    def _get_existing_rows_count(self, options: Dict[str, Any]) -> int:
        """Получить количество строк в существующей таблице"""
        table_fullname = (
            f"{options['schema_name']}.{options['table_name']}"
            if options.get('schema_name')
            else options['table_name']
        )
        try:
            with options['database'].get_sqla_engine() as engine:
                with engine.connect() as conn:
                    result = conn.execute(
                        sa.text(f"SELECT COUNT(*) FROM {table_fullname}"))
                    return result.scalar() or 0
        except Exception as e:
            logger.warning(
                "Не удалось получить количество строк из таблицы %s: %s",
                table_fullname, str(e))
            return 0
