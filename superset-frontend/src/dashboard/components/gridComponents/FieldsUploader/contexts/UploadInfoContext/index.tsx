import {
  createContext,
  useContext,
  useCallback,
  FC,
  PropsWithChildren,
  useMemo,
} from 'react';
import { isEqual } from 'lodash';
import { ComponentType, ComponentFunc, UploadInfoType } from '../../types';

type UpdateUploadInfoContextType = <K extends keyof UploadInfoType>(
  key: K,
  value: UploadInfoType[K],
) => void;

const UploadInfoContext = createContext<UploadInfoType | undefined>(undefined);
const UpdateUploadInfoContext = createContext<
  UpdateUploadInfoContextType | undefined
>(undefined);
const EditModeContext = createContext<boolean | undefined>(undefined);

interface ComponentStateProviderProps {
  component: ComponentType;
  updateComponents: ComponentFunc;
  editMode: boolean;
}
const initialUploadInfo = {
  database: { value: 0, label: '' },
  schema: { value: '', label: '' },
  table: '',
  fields: [],
};
export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderProps>
> = ({ children, component, updateComponents, editMode }) => {
  const uploadInfo = useMemo<UploadInfoType>(
    () => component.meta.uploadInfo ?? initialUploadInfo,
    [component.meta.uploadInfo],
  );

  const updateUploadInfo = useCallback<UpdateUploadInfoContextType>(
    (key, value) => {
      const current = component.meta.uploadInfo?.[key];
      if (!isEqual(current, value)) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              uploadInfo: {
                ...(component.meta.uploadInfo ?? initialUploadInfo),
                [key]: value,
              },
            },
          },
        });
      }
    },
    [component.id, component.meta, updateComponents],
  );

  return (
    <UploadInfoContext.Provider value={uploadInfo}>
      <UpdateUploadInfoContext.Provider value={updateUploadInfo}>
        <EditModeContext.Provider value={editMode}>
          {children}
        </EditModeContext.Provider>
      </UpdateUploadInfoContext.Provider>
    </UploadInfoContext.Provider>
  );
};

export const useUploadInfo = (): UploadInfoType => {
  const context = useContext(UploadInfoContext);
  if (context === undefined) {
    throw new Error('useUploadInfo must be used within ComponentStateProvider');
  }
  return context;
};

export const useUpdateUploadInfo = (): UpdateUploadInfoContextType => {
  const context = useContext(UpdateUploadInfoContext);
  if (context === undefined) {
    throw new Error(
      'useUpdateUploadInfo must be used within ComponentStateProvider',
    );
  }
  return context;
};

export const useEditMode = (): boolean => {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within ComponentStateProvider');
  }
  return context;
};
