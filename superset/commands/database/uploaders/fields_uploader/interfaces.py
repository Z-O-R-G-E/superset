from typing import Any, Optional, TypedDict, List, Dict
from abc import ABC, abstractmethod
import sqlalchemy as sa
import pandas as pd
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
    if_exists: str

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
    def get_column_types(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
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

class IDataFrameConverter(ABC):
    @abstractmethod
    def convert_to_dataframe(
            self,
            fields: List[Dict[str, Any]],
            options: Dict[str, Any]
    ) -> pd.DataFrame:
        pass

class IDatabaseLoader(ABC):
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
