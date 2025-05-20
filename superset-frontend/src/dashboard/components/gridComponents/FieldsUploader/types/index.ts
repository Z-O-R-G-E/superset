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
export type UploadFieldType = {
  name: string;
  type: string;
  width: number;
};

export interface UploadInfoType {
  database: UploadDatabaseType | undefined;
  schema: UploadSchemaType | undefined;
  table: UploadTableType;
  queryType: string | undefined;
  fields: UploadFieldType[];
}

export type HeaderType = {
  active: boolean;
  label: string;
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
    uploadInfo: UploadInfoType;
    header: HeaderType;
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
