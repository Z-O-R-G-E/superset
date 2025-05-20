import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { ComponentFunc, ComponentType, HeaderType } from '../../types';
import { shallowEqual } from '../../utils';

type UpdateHeaderFn = <K extends keyof HeaderType>(
  key: K,
  value: HeaderType[K],
) => void;

export const initialHeader: HeaderType = {
  active: false,
  label: '',
};

const HeaderContext = createContext<HeaderType | null>(null);
const UpdateHeaderContext = createContext<UpdateHeaderFn | null>(null);

export const useOptimizedUpdateHeader = (
  component: ComponentType,
  updateComponents: ComponentFunc,
) =>
  useCallback<UpdateHeaderFn>(
    (key, value) => {
      const prevHeader = component.meta.header ?? initialHeader;
      if (prevHeader[key] === value) return;

      const shouldUpdate =
        typeof value === 'object'
          ? !shallowEqual({ [key]: prevHeader[key] }, { [key]: value })
          : true;

      if (shouldUpdate) {
        const updatedHeader = { ...prevHeader, [key]: value };
        if (key === 'active' && value === false) {
          updatedHeader.label = '';
        }

        updateComponents({
          [component.id]: {
            ...component,
            meta: { ...component.meta, header: updatedHeader },
          },
        });
      }
    },
    [component, updateComponents],
  );

export const HeaderProvider: FC<
  PropsWithChildren<{ header: HeaderType; updateHeader: UpdateHeaderFn }>
> = memo(({ header, updateHeader, children }) => {
  const headerValue = useMemo(() => header, [header]);
  const updateValue = useMemo(() => updateHeader, [updateHeader]);

  return (
    <HeaderContext.Provider value={headerValue}>
      <UpdateHeaderContext.Provider value={updateValue}>
        {children}
      </UpdateHeaderContext.Provider>
    </HeaderContext.Provider>
  );
});

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) throw new Error('useHeader requires HeaderProvider');
  return context;
};

export const useUpdateHeader = () => {
  const context = useContext(UpdateHeaderContext);
  if (!context) throw new Error('useUpdateHeader requires HeaderProvider');
  return context;
};
