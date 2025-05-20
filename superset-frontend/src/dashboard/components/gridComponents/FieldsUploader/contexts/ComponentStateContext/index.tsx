import {
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useMemo,
} from 'react';

import { ComponentFunc, ComponentType } from '../../types';
import {
  initialUploadInfo,
  UploadInfoProvider,
  useOptimizedUpdateUploadInfo,
} from '../UploadInfoContext';
import {
  HeaderProvider,
  initialHeader,
  useOptimizedUpdateHeader,
} from '../HeaderContext';
import { ComponentInfoProvider } from '../ComponentInfoContext';

interface ComponentStateProviderProps {
  component: ComponentType;
  updateComponents: ComponentFunc;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  columnWidth: number;
  widthMultiple: number;
  editMode: boolean;
}

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderProps>
> = ({
  children,
  component,
  updateComponents,
  setDisableDragDrop,
  columnWidth,
  widthMultiple,
  editMode,
}) => {
  const uploadInfo = useMemo(
    () => component.meta.uploadInfo ?? initialUploadInfo,
    [component.meta.uploadInfo],
  );

  const header = useMemo(
    () => component.meta.header ?? initialHeader,
    [component.meta.header],
  );

  const updateUploadInfo = useOptimizedUpdateUploadInfo(
    component,
    updateComponents,
  );
  const updateHeader = useOptimizedUpdateHeader(component, updateComponents);

  const componentInfo = useMemo(
    () => ({
      editMode,
      setDisableDragDrop,
      columnWidth,
      widthMultiple,
    }),
    [editMode, setDisableDragDrop, columnWidth, widthMultiple],
  );

  return (
    <UploadInfoProvider
      uploadInfo={uploadInfo}
      updateUploadInfo={updateUploadInfo}
    >
      <HeaderProvider header={header} updateHeader={updateHeader}>
        <ComponentInfoProvider componentInfo={componentInfo}>
          {children}
        </ComponentInfoProvider>
      </HeaderProvider>
    </UploadInfoProvider>
  );
};
