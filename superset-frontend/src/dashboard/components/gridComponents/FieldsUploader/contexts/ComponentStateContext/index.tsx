import {
  FC,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
  useMemo,
} from 'react';
import { ComponentType, ComponentFunc } from '../../types';
import {
  HeaderProvider,
  useOptimizedUpdateHeader,
  initialHeader,
} from '../HeaderContext';
import {
  DataWarehouseProvider,
  useOptimizedUpdateDataWarehouse,
  initialDataWarehouse,
} from '../DataWarehouseContext';
import {
  UploadFieldsProvider,
  useOptimizedUpdateUploadFields,
} from '../UploadFieldsContext';
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
  const header = useMemo(
    () => component.meta.header ?? initialHeader,
    [component.meta.header],
  );
  const dataWarehouse = useMemo(
    () => component.meta.dataWarehouse ?? initialDataWarehouse,
    [component.meta.dataWarehouse],
  );
  const uploadFields = useMemo(
    () => component.meta.uploadFields ?? [],
    [component.meta.uploadFields],
  );

  const updateHeader = useOptimizedUpdateHeader(component, updateComponents);
  const updateDataWarehouse = useOptimizedUpdateDataWarehouse(
    component,
    updateComponents,
  );
  const updateUploadFields = useOptimizedUpdateUploadFields(
    component,
    updateComponents,
  );

  const componentInfo = useMemo(
    () => ({ editMode, setDisableDragDrop, columnWidth, widthMultiple }),
    [editMode, setDisableDragDrop, columnWidth, widthMultiple],
  );

  return (
    <HeaderProvider header={header} updateHeader={updateHeader}>
      <DataWarehouseProvider
        dataWarehouse={dataWarehouse}
        updateDataWarehouse={updateDataWarehouse}
      >
        <UploadFieldsProvider
          uploadFields={uploadFields}
          updateUploadFields={updateUploadFields}
        >
          <ComponentInfoProvider componentInfo={componentInfo}>
            {children}
          </ComponentInfoProvider>
        </UploadFieldsProvider>
      </DataWarehouseProvider>
    </HeaderProvider>
  );
};
