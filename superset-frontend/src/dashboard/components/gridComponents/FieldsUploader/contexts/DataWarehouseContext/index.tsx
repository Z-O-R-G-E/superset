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

type UpdateDWFn = <K extends keyof DataWarehouseType>(
  key: K,
  value: DataWarehouseType[K],
) => void;

export const initialDataWarehouse: DataWarehouseType = {
  database: undefined,
  schema: undefined,
  table: '',
  queryType: undefined,
};

const DWContext = createContext<DataWarehouseType | null>(null);
const UpdateDWContext = createContext<UpdateDWFn | null>(null);

export const useOptimizedUpdateDataWarehouse = (
  component: ComponentType,
  updateComponents: ComponentFunc,
): UpdateDWFn =>
  useCallback(
    (key, value) => {
      const prev = component.meta.dataWarehouse ?? initialDataWarehouse;
      if (prev[key] === value) return;

      const shouldUpdate =
        typeof value === 'object'
          ? !shallowEqual({ [key]: prev[key] }, { [key]: value })
          : true;

      if (shouldUpdate) {
        const updated = { ...prev, [key]: value };
        if (key === 'database') updated.schema = undefined;

        updateComponents({
          [component.id]: {
            ...component,
            meta: { ...component.meta, dataWarehouse: updated },
          },
        });
      }
    },
    [component, updateComponents],
  );

export const DataWarehouseProvider: FC<
  PropsWithChildren<{
    dataWarehouse: DataWarehouseType;
    updateDataWarehouse: UpdateDWFn;
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
