from typing import Any, Optional, TypedDict, List, Dict
from abc import ABC, abstractmethod
import sqlalchemy as sa
import pandas as pd
from superset.commands.database.uploaders.fields_uploader.constants import TYPE_MAPPING, \
    DBMS_CONFIG
from superset.models.core import Database

class FieldsReaderOptions(TypedDict, total=False):
    index_column: str
    day_first: bool
    null_values: List[str]
    already_exists: str
    index_label: str
    dataframe_index: bool
    datetime_format: Optional[str]
    dbms: str


class IDatabaseAdapter(ABC):
    """Абстрактный класс адаптера для работы с разными СУБД"""
    @abstractmethod
    def table_exists(self, table_name: str) -> bool:
        """Проверить существование таблицы"""
        pass

    @abstractmethod
    def create_table(self, table_name: str, fields: List[Dict[str, Any]]) -> None:
        """Создать таблицу в БД"""
        pass

    @abstractmethod
    def drop_table(self, table_name: str) -> None:
        """Удалить таблицу"""
        pass

    @abstractmethod
    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        """Получить типы колонок для данной СУБД"""
        pass

    @abstractmethod
    def insert_data(self, table_name: str, data: pd.DataFrame) -> None:
        """Вставить данные в таблицу"""
        pass

# Базовые классы
class IFieldHandler(ABC):
    """Абстрактный базовый класс для обработчиков полей"""

    @abstractmethod
    def handle(self, value: Any) -> Any:
        """Обработать значение поля"""
        pass

    @abstractmethod
    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        """Получить соответствующий тип SQLAlchemy"""
        pass

    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        """Получить DBMS-специфичный тип данных"""
        field_type = (field.get("type") or "").upper().strip()
        if field_type in TYPE_MAPPING:
            return field_type
        return DBMS_CONFIG.get(dbms, {}).get(self._infer_base_type(field), "TEXT")

    def _infer_base_type(self, field: Dict[str, Any]) -> str:
        """Определить базовый тип данных"""
        type_str = (field.get("type") or "").lower()
        if "int" in type_str:
            return "integer"
        elif "float" in type_str or "double" in type_str:
            return "float"
        elif "decimal" in type_str or "numeric" in type_str:
            return "decimal"
        elif "date" in type_str:
            return "date"
        elif "time" in type_str:
            return "datetime" if "timestamp" in type_str else "time"
        elif "bool" in type_str:
            return "boolean"
        return "string"

class IDataFrameConverter(ABC):
    """Абстракция для конвертации полей в DataFrame"""

    @abstractmethod
    def convert_to_dataframe(
            self,
            fields: List[Dict[str, Any]],
            options: Dict[str, Any]
    ) -> pd.DataFrame:
        pass


class IDatabaseLoader(ABC):
    """Абстракция для загрузки данных в БД"""

    @abstractmethod
    def load_to_database(
            self,
            df: pd.DataFrame,
            database: Database,
            table_name: str,
            schema_name: Optional[str],
            fields_metadata: List[Dict[str, Any]],
            options: Dict[str, Any]
    ) -> None:
        pass
