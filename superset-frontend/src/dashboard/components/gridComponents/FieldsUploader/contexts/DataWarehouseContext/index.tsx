import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import { DataWarehouseType, ComponentType, ComponentFunc } from '../../types';
import { shallowEqual } from '../../utils';

export const initialDataWarehouse: Partial<DataWarehouseType> = {
  subd: undefined,
  database: undefined,
  schema: undefined,
  table: '',
  queryType: undefined,
};

const DWContext = createContext<DataWarehouseType | null>(null);
const UpdateDWContext = createContext<
  ((newData: DataWarehouseType) => void) | null
>(null);

export const useOptimizedUpdateDataWarehouse = (
  component: ComponentType,
  updateComponents: ComponentFunc,
) =>
  useCallback(
    (newDataWarehouse: DataWarehouseType) => {
      const prev = component.meta.dataWarehouse ?? initialDataWarehouse;

      if (shallowEqual(prev, newDataWarehouse)) {
        return;
      }

      updateComponents({
        [component.id]: {
          ...component,
          meta: {
            ...component.meta,
            dataWarehouse: newDataWarehouse,
          },
        },
      });
    },
    [component, updateComponents],
  );

export const DataWarehouseProvider: FC<
  PropsWithChildren<{
    dataWarehouse: DataWarehouseType;
    updateDataWarehouse: (newData: DataWarehouseType) => void;
  }>
> = memo(({ dataWarehouse, updateDataWarehouse, children }) => (
  <DWContext.Provider value={dataWarehouse}>
    <UpdateDWContext.Provider value={updateDataWarehouse}>
      {children}
    </UpdateDWContext.Provider>
  </DWContext.Provider>
));

export const useDataWarehouse = () => {
  const ctx = useContext(DWContext);
  if (!ctx)
    throw new Error(
      'useDataWarehouse must be used within DataWarehouseProvider',
    );
  return ctx;
};

export const useUpdateDataWarehouse = () => {
  const ctx = useContext(UpdateDWContext);
  if (!ctx)
    throw new Error(
      'useUpdateDataWarehouse must be used within DataWarehouseProvider',
    );
  return ctx;
};
