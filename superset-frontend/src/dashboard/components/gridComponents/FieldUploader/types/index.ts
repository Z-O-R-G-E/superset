import { ResizeCallback, ResizeStartCallback } from 're-resizable';
import { LayoutItem } from '../../../../types';

export type LabeledValue<T = string | number> = {
  value: T;
  label: string;
};
export type UploadDatabaseType = LabeledValue<number>;
export type UploadSchemaType = LabeledValue<string>;
export type UploadTableType = string;
export type UploadFieldType = { name: string; type: string };

export interface UploadInfoType {
  database: UploadDatabaseType;
  schema: UploadSchemaType;
  table: UploadTableType;
  fields: UploadFieldType[];
}

export type UploaderComponentType = LayoutItem & { uploadInfo: UploadInfoType };

export interface FieldsUploaderFormProps {
  component: UploaderComponentType;
  updateComponents: Function;
  editMode: boolean;
}

export interface FieldsUploaderProps {
  id: string;
  parentId: string;
  component: UploaderComponentType;
  parentComponent: LayoutItem;
  index: number;
  depth: number;
  editMode: boolean;

  // grid related
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ResizeStartCallback;
  onResize: ResizeCallback;
  onResizeStop: ResizeCallback;

  // dnd
  deleteComponent: (id: string, parentId: string) => void;
  handleComponentDrop: (...args: unknown[]) => unknown;
  updateComponents: Function;
}
