import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import { HeaderType, ComponentFunc, ComponentType } from '../../types';
import { shallowEqual } from '../../utils';

type UpdateHeaderFn = (header: HeaderType) => void;

export const initialHeader: HeaderType = {
  active: false,
  label: '',
};

const HeaderContext = createContext<HeaderType | null>(null);
const UpdateHeaderContext = createContext<UpdateHeaderFn | null>(null);

export const useOptimizedUpdateHeader = (
  component: ComponentType,
  updateComponents: ComponentFunc,
): UpdateHeaderFn =>
  useCallback(
    newHeader => {
      const prevHeader = component.meta.header ?? initialHeader;

      if (shallowEqual(prevHeader, newHeader)) return;

      updateComponents({
        [component.id]: {
          ...component,
          meta: { ...component.meta, header: newHeader },
        },
      });
    },
    [component, updateComponents],
  );

export const HeaderProvider: FC<
  PropsWithChildren<{ header: HeaderType; updateHeader: UpdateHeaderFn }>
> = memo(({ header, updateHeader, children }) => (
  <HeaderContext.Provider value={header}>
    <UpdateHeaderContext.Provider value={updateHeader}>
      {children}
    </UpdateHeaderContext.Provider>
  </HeaderContext.Provider>
));

export const useHeader = () => {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error('useHeader must be used within HeaderProvider');
  return ctx;
};

export const useUpdateHeader = () => {
  const ctx = useContext(UpdateHeaderContext);
  if (!ctx)
    throw new Error('useUpdateHeader must be used within HeaderProvider');
  return ctx;
};
