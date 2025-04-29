import { ResizeCallback, ResizeStartCallback } from 're-resizable';
import { LayoutItem } from '../../../../types';

export type UploaderComponentType = LayoutItem & { uploadInfo: UploadInfo };

export interface UploadInfo {
  database: { value: number; label: string } | undefined;
  schema: { value: string; label: string } | undefined;
  table: string;
  fields: { type: string; value: string | number; label: string }[];
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
