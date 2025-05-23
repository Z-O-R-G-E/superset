import componentTypes from '../../../../util/componentTypes';
import headerStyleOptions from '../../../../util/headerStyleOptions';
import backgroundStyleOptions from '../../../../util/backgroundStyleOptions';

export type UploadFieldsSettingsStateType = {
  isOpen: boolean;
  editFieldIndex: number | null;
};

export type LabeledValue<T = string | number> = {
  value: T;
  label: string;
};
export type UploadDatabaseType = LabeledValue<number>;
export type UploadSchemaType = LabeledValue<string>;
export type UploadTableType = string;

export type HeaderType = {
  active: boolean;
  label: string;
};

export interface DataWarehouseType {
  database?: UploadDatabaseType;
  schema?: UploadSchemaType;
  table: UploadTableType;
  queryType?: string;
}

export type UploadFieldType = {
  name: string;
  type: string;
  size?: number;
  setEnum?: string[];
  precision?: number;
  scale?: number;
  value: string;
  width?: number;
};

export type ComponentType = {
  id: string;
  type: (typeof componentTypes)[keyof typeof componentTypes];
  parents: string[];
  children: string[];
  meta: {
    width?: number;
    height?: number;
    headerSize?: (typeof headerStyleOptions)[number]['value'];
    background?: (typeof backgroundStyleOptions)[number]['value'];
    chartId?: number;
    header: HeaderType;
    dataWarehouse: DataWarehouseType;
    uploadFields: UploadFieldType[];
  };
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

  // from redux
  logEvent: (action: string, data: any) => void;

  // grid related
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ComponentFunc;
  onResize: ComponentFunc;
  onResizeStop: ComponentFunc;

  // dnd
  deleteComponent: ComponentFunc;
  handleComponentDrop: ComponentFunc;
  updateComponents: ComponentFunc;
}
