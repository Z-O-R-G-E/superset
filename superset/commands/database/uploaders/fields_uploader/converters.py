# converters.py
import logging
import sqlalchemy as sa
import pandas as pd

from typing import Any, List, Dict
from flask_babel import lazy_gettext as _

from superset.commands.database.exceptions import DatabaseUploadFailed
from superset.commands.database.uploaders.fields_uploader.registry import TypeHandlerRegistry
from superset.commands.database.uploaders.fields_uploader.utils import NullChecker

logger = logging.getLogger(__name__)

class DataFrameConverter:
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
        data = self._process_fields(fields, null_checker)

        if not data:
            raise DatabaseUploadFailed(_("Нет допустимых полей для загрузки"))

        df = pd.DataFrame(data)
        self._process_index(df, options, fields)
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
    ) -> Dict[str, List[Any]]:
        """Обработать поля и преобразовать в данные"""
        data = {}

        for field in fields:
            name = field.get("name")
            if not name or not isinstance(name, str):
                continue

            field_type = (field.get("type", "") or "").strip()
            handler = self.type_handler_registry.get_handler_instance(field_type)
            value = field.get("value")

            try:
                processed_value = null_checker.process_value(value, field_type)
                data[name] = [handler.handle(processed_value) if processed_value is not None else None]
            except Exception as ex:
                logger.warning(
                    "Ошибка обработки поля %s: %s. Используется строковый тип.",
                    name, str(ex))
                data[name] = [str(value) if value is not None else None]

        return data

    def _process_index(self, df: pd.DataFrame, options: Dict[str, Any], fields: List[Dict[str, Any]]) -> None:
        """Обработать индекс DataFrame и подготовить параметры для адаптера"""
        index_col = options.get("index_column")
        use_index = options.get("dataframe_index", False)
        index_label = options.get("index_label")
        already_exists = options.get("already_exists", "fail")

        if isinstance(index_label, str) and index_label.lower() == "undefined":
            index_label = None

        # Определяем окончательное имя индекса
        final_index_label = (
            index_label if index_label and index_label != '' else
            index_col if index_col and index_col != '' else
            "id"
        )

        # Определяем тип индекса
        index_type = None
        if index_col and index_col in df.columns:
            for field in fields:
                if field['name'] == index_col:
                    index_type = self._get_column_type(field)
                    break

        if not index_type:
            index_type = "INTEGER"  # тип по умолчанию

        # Обрабатываем индекс DataFrame
        if not use_index:
            if index_col and index_col in df.columns:
                df.set_index(index_col, inplace=True)
                if index_label:
                    df.index.name = index_label
            return

        if not index_col or index_col == '':
            offset = 0
            if already_exists == "append":
                offset = self._get_existing_rows_count(options)

            df.index = pd.RangeIndex(start=offset, stop=offset + len(df))
            df.index.name = final_index_label
        else:
            if index_col in df.columns:
                df.set_index(index_col, inplace=True)
                df.index.name = final_index_label if final_index_label else index_col

        # Сохраняем параметры индекса для адаптера
        options["index_label"] = final_index_label
        options["index_type"] = index_type

    def _get_column_type(self, field: Dict[str, Any]) -> str:
        """Возвращает тип колонки для поля"""
        field_type = field.get('type', 'string').lower()
        handler = self.type_handler_registry.get_handler_instance(field_type)
        return handler.get_dbms_specific_type(field, "postgresql")  # базовый тип, адаптер может изменить

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
