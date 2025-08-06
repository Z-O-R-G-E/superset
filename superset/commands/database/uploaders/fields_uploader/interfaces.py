import pandas as pd

from typing import Any, Optional, List, Dict
from abc import ABC, abstractmethod


class IDatabaseAdapter(ABC):
    @abstractmethod
    def table_exists(self, table_name: str, schema: Optional[str] = None) -> bool:
        pass

    @abstractmethod
    def create_table(
        self,
        table_name: str,
        fields: List[Dict[str, Any]],
        schema: Optional[str] = None,
        index_column: Optional[str] = None,
        index_label: Optional[str] = None,
        index_type: Optional[str] = None,
    ) -> None:
        pass

    @abstractmethod
    def drop_table(self, table_name: str, schema: Optional[str] = None) -> None:
        pass

    @abstractmethod
    def insert_data(
        self,
        table_name: str,
        data: pd.DataFrame,
        schema: Optional[str] = None,
        if_exists: str = "fail",
        index: bool = False,
        index_label: Optional[str] = None
    ) -> None:
        pass

    @abstractmethod
    def get_qualified_table_name(self, table_name: str, schema: Optional[str] = None) -> str:
        pass


class IFieldHandler(ABC):
    """Интерфейс для обработчиков типов данных."""

    @abstractmethod
    def handle(self, value: Any) -> Any:
        """Обработка значения поля."""
        pass

    @abstractmethod
    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        """Возвращает тип данных, специфичный для указанной СУБД."""
        pass
