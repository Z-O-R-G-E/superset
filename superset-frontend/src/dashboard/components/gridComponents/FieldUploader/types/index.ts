import { ResizeCallback, ResizeStartCallback } from 're-resizable';
import { LayoutItem } from '../../../../types';

export type UploaderComponentType = LayoutItem & { uploadInfo: UploadInfo };
export type UploadDatabaseType = { value: number; label: string };
export type UploadSchemaType = { value: string; label: string };
export type UploadFieldType = {
  type: string;
  value: string | number;
  label: string;
};

export interface UploadInfo {
  database: UploadDatabaseType | undefined;
  schema: UploadSchemaType | undefined;
  table: string;
  fields: UploadFieldType[];
}

export interface FieldUploaderProps {
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
