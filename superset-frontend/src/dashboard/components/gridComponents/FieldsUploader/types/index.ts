import componentTypes from '../../../../util/componentTypes';
import headerStyleOptions from '../../../../util/headerStyleOptions';
import backgroundStyleOptions from '../../../../util/backgroundStyleOptions';

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
  database: UploadDatabaseType;
  schema: UploadSchemaType;
  table: UploadTableType;
  fields: UploadFieldType[];
}

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
  };
};

export type UploaderInfoComponentType = ComponentType & {
  uploadInfo: UploadInfoType;
};

export type ComponentFunc = (...args: any[]) => any;

export interface FieldsUploaderProps {
  id: string;
  parentId: string;
  component: UploaderInfoComponentType;
  parentComponent: ComponentType;
  index: number;
  depth: number;
  editMode: boolean;

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
