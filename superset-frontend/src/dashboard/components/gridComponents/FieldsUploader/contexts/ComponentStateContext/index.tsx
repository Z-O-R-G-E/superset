import {
  FC,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
  useMemo,
  createContext,
  useContext,
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
import {
  ColumnsSettingsProvider,
  initialColumnsSettings,
  useOptimizedUpdateColumnsSettings,
} from '../ColumnsSettingsContext';

interface ComponentStateContextType {
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  columnWidth: number;
  widthMultiple: number;
  editMode: boolean;
}

type ComponentStateProviderType = ComponentStateContextType & {
  component: ComponentType;
  updateComponents: ComponentFunc;
};

const ComponentStateContext = createContext<ComponentStateContextType | null>(
  null,
);

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderType>
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
  const columnsSettings = useMemo(
    () => component.meta.columnsSettings ?? initialColumnsSettings,
    [component.meta.columnsSettings],
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
  const updateColumnsSettings = useOptimizedUpdateColumnsSettings(
    component,
    updateComponents,
  );
  const updateDataWarehouse = useOptimizedUpdateDataWarehouse(
    component,
    updateComponents,
  );

  const updateUploadFields = useOptimizedUpdateUploadFields(
    component,
    updateComponents,
  );

  const componentState = useMemo(
    () => ({ editMode, setDisableDragDrop, columnWidth, widthMultiple }),
    [editMode, setDisableDragDrop, columnWidth, widthMultiple],
  );

  return (
    <ComponentStateContext.Provider value={componentState}>
      <HeaderProvider header={header} updateHeader={updateHeader}>
        <ColumnsSettingsProvider
          columnsSettings={columnsSettings}
          updateColumnsSettings={updateColumnsSettings}
        >
          <DataWarehouseProvider
            dataWarehouse={dataWarehouse}
            updateDataWarehouse={updateDataWarehouse}
          >
            <UploadFieldsProvider
              uploadFields={uploadFields}
              updateUploadFields={updateUploadFields}
            >
              {children}
            </UploadFieldsProvider>
          </DataWarehouseProvider>
        </ColumnsSettingsProvider>
      </HeaderProvider>
    </ComponentStateContext.Provider>
  );
};

export const useComponentState = (): ComponentStateContextType => {
  const context = useContext(ComponentStateContext);
  if (!context) {
    throw new Error(
      'useComponentState must be used within ComponentStateProvider',
    );
  }
  return context;
};
