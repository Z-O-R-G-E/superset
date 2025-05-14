import {
  createContext,
  useContext,
  useMemo,
  FC,
  PropsWithChildren,
} from 'react';

import { UploaderInfoComponentType, UploadInfoType } from '../../types';

export interface ComponentStateContextType {
  component: UploaderInfoComponentType;
  updateUploadInfo: <K extends keyof UploadInfoType>(
    key: K,
    value: UploadInfoType[K],
  ) => void;
  editMode: boolean;
}

const ComponentStateContext = createContext<
  ComponentStateContextType | undefined
>(undefined);

ComponentStateContext.displayName = 'ComponentStateContext';

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateContextType>
> = ({ children, component, updateUploadInfo, editMode }) => {
  const stateValue = useMemo(
    () => ({ component, updateUploadInfo, editMode }),
    [component, updateUploadInfo, editMode],
  );

  return (
    <ComponentStateContext.Provider value={stateValue}>
      {children}
    </ComponentStateContext.Provider>
  );
};

export const useComponentState = (): ComponentStateContextType => {
  const context = useContext(ComponentStateContext);
  if (!context)
    throw new Error(
      'useComponentState must be used within ComponentStateProvider',
    );
  return context;
};
