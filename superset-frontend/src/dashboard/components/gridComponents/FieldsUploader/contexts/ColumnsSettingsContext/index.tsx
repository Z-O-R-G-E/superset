import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import { ComponentFunc, ComponentType, ColumnsSettingsType } from '../../types';
import { shallowEqual } from '../../utils';

type UpdateColumnsSettingsFn = (columnsSettings: ColumnsSettingsType) => void;

export const initialColumnsSettings: Partial<ColumnsSettingsType> = {
  dayFirst: undefined,
  nullValues: undefined,
  dataframeIndex: undefined,
  indexColumn: undefined,
  indexLabel: undefined,
};

const ColumnsSettingsContext = createContext<ColumnsSettingsType | null>(null);
const UpdateColumnsSettingsContext =
  createContext<UpdateColumnsSettingsFn | null>(null);

export const useOptimizedUpdateColumnsSettings = (
  component: ComponentType,
  updateComponents: ComponentFunc,
): UpdateColumnsSettingsFn =>
  useCallback(
    newColumnsSettings => {
      const prevColumnsSettings =
        component.meta.columnsSettings ?? initialColumnsSettings;

      if (shallowEqual(prevColumnsSettings, newColumnsSettings)) return;

      updateComponents({
        [component.id]: {
          ...component,
          meta: { ...component.meta, columnsSettings: newColumnsSettings },
        },
      });
    },
    [component, updateComponents],
  );

export const ColumnsSettingsProvider: FC<
  PropsWithChildren<{
    columnsSettings: ColumnsSettingsType;
    updateColumnsSettings: UpdateColumnsSettingsFn;
  }>
> = memo(({ columnsSettings, updateColumnsSettings, children }) => (
  <ColumnsSettingsContext.Provider value={columnsSettings}>
    <UpdateColumnsSettingsContext.Provider value={updateColumnsSettings}>
      {children}
    </UpdateColumnsSettingsContext.Provider>
  </ColumnsSettingsContext.Provider>
));

export const useColumnsSettings = () => {
  const ctx = useContext(ColumnsSettingsContext);
  if (!ctx)
    throw new Error(
      'useColumnsSettings must be used within ColumnsSettingsProvider',
    );
  return ctx;
};

export const useUpdateColumnsSettings = () => {
  const ctx = useContext(UpdateColumnsSettingsContext);
  if (!ctx)
    throw new Error(
      'useUpdateColumnsSettings must be used within ColumnsSettingsProvider',
    );
  return ctx;
};
