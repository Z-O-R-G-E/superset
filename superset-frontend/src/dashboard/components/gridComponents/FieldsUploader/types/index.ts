import componentTypes from '../../../../util/componentTypes';
import headerStyleOptions from '../../../../util/headerStyleOptions';
import backgroundStyleOptions from '../../../../util/backgroundStyleOptions';

export type DataType =
  | 'TINYINT'
  | 'SMALLINT'
  | 'INT'
  | 'INTEGER'
  | 'BIGINT'
  | 'FLOAT'
  | 'FLOAT32'
  | 'FLOAT64'
  | 'DOUBLE'
  | 'REAL'
  | 'DECIMAL'
  | 'NUMERIC'
  | 'NUMBER'
  | 'BINARY_FLOAT'
  | 'BINARY_DOUBLE'
  | 'CHAR'
  | 'VARCHAR'
  | 'TEXT'
  | 'NCHAR'
  | 'NVARCHAR'
  | 'CLOB'
  | 'LONGTEXT'
  | 'FIXEDSTRING'
  | 'STRING'
  | 'BINARY'
  | 'VARBINARY'
  | 'BLOB'
  | 'BYTEA'
  | 'RAW'
  | 'BINARY_JSON'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'TIMESTAMP'
  | 'DATETIME64'
  | 'TIMESTAMPTZ'
  | 'INTERVAL'
  | 'BOOLEAN'
  | 'BIT'
  | 'BOOL'
  | 'UINT8'
  | 'JSON'
  | 'JSONB'
  | 'UUID'
  | 'XML'
  | 'BSON'
  | 'GEOMETRY'
  | 'POINT'
  | 'LINESTRING'
  | 'POLYGON'
  | 'GEOJSON'
  | 'ARRAY'
  | 'ENUM'
  | 'SET'
  | 'NESTED'
  | 'LowCardinality(String)'
  | 'IPv4'
  | 'IPv6'
  | 'AggregateFunction';

export type UploadFieldsSettingsStateType = {
  isOpen: boolean;
  editFieldIndex: number | null;
};

export type DbmsType =
  | 'postgresql'
  | 'mysql'
  | 'mssql'
  | 'clickhousedb'
  | 'oracle'
  | 'sqlite'
  | 'mariadb'
  | 'mongodb'
  | 'elasticsearch';

export type HeaderType = {
  active: boolean;
  label: string;
};

export type LabeledValue<T = string | number> = {
  value: T;
  label: string;
};

export type UploadDatabaseType = LabeledValue<number>;
export type UploadSchemaType = LabeledValue<string>;
export type UploadTableType = string;
export type AlreadyExistsType = 'replace' | 'append';

export type ColumnsSettingsType = {
  dayFirst: boolean;
  nullValues: string[];
  dataframeIndex: boolean;
  indexColumn: string | null;
  indexLabel: string;
};

export interface DataWarehouseType {
  dbms: DbmsType;
  database: UploadDatabaseType;
  schema?: UploadSchemaType;
  table: UploadTableType;
  alreadyExists: AlreadyExistsType;
}

export type UploadFieldFormatType = {
  size?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
};

export type UploadFieldLayoutType = {
  width?: number;
  isAutoSize: boolean;
  rowCount: number;
  hasCounter: boolean;
  isMultiple: boolean;
  description: string;
  hasDescription: boolean;
  isField: boolean;
};

export type UploadFieldConfigType = {
  index: number;
  name: string;
  type: DataType;
  value: string;
  isRequired: boolean;
};

export type UploadFieldType = UploadFieldFormatType &
  UploadFieldLayoutType &
  UploadFieldConfigType;

export type ComponentType = {
  id: string;
  type: keyof typeof componentTypes;
  parents: string[];
  children: string[];
  meta: {
    width?: number;
    height?: number;
    headerSize?: (typeof headerStyleOptions)[number]['value'];
    background?: (typeof backgroundStyleOptions)[number]['value'];
    chartId?: number;
    header: HeaderType;
    columnsSettings: ColumnsSettingsType;
    dataWarehouse: DataWarehouseType;
    uploadFields: UploadFieldType[];
  };
};

export type BaseFieldProps = Omit<UploadFieldConfigType, 'value' | 'index'> &
  Required<
    Omit<
      UploadFieldLayoutType,
      'width' | 'description' | 'hasDescription' | 'isField'
    >
  > &
  UploadFieldFormatType & {
    tooltipContent: JSX.Element | null;
  };

export type ComponentFunc = (...args: any[]) => void;

export interface FieldsUploaderProps {
  id: string;
  parentId: string;
  component: ComponentType;
  parentComponent: ComponentType;
  index: number;
  depth: number;
  editMode: boolean;
  logEvent: (action: string, data: any) => void;
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ComponentFunc;
  onResize: ComponentFunc;
  onResizeStop: ComponentFunc;
  deleteComponent: ComponentFunc;
  handleComponentDrop: ComponentFunc;
  updateComponents: ComponentFunc;
}
