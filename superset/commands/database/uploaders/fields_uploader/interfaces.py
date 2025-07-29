import sqlalchemy as sa
import pandas as pd

from typing import Any, Optional, TypedDict, List, Dict
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
        schema: Optional[str] = None
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
        if_exists: str = "fail"
    ) -> None:
        pass

    @abstractmethod
    def get_qualified_table_name(self, table_name: str, schema: Optional[str] = None) -> str:
        pass

class IFieldHandler(ABC):
    @abstractmethod
    def handle(self, value: Any) -> Any:
        pass

    @abstractmethod
    def get_sqlalchemy_type(self, field: Dict[str, Any]) -> sa.types.TypeEngine:
        pass

    @abstractmethod
    def get_dbms_specific_type(self, field: Dict[str, Any], dbms: str) -> str:
        pass

    @abstractmethod
    def get_pandas_type(self) -> str:
        pass
