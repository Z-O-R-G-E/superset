import {
  createContext,
  useContext,
  useCallback,
  FC,
  PropsWithChildren,
  memo,
} from 'react';
import { isEqual } from 'lodash';
import { ComponentType, ComponentFunc, UploadInfoType } from '../../types';

const initialUploadInfo = {
  database: undefined,
  schema: undefined,
  table: '',
  fields: [],
};

type UpdateUploadInfoContextType = <K extends keyof UploadInfoType>(
  key: K,
  value: UploadInfoType[K],
) => void;

const UploadInfoContext = createContext<UploadInfoType>(initialUploadInfo);
const UpdateUploadInfoContext = createContext<UpdateUploadInfoContextType>(
  () => {},
);
const EditModeContext = createContext<boolean>(false);

interface ComponentStateProviderProps {
  component: ComponentType;
  updateComponents: ComponentFunc;
  editMode: boolean;
}

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderProps>
> = memo(({ children, component, updateComponents, editMode }) => {
  const uploadInfo = component.meta.uploadInfo ?? initialUploadInfo;

  const updateUploadInfo = useCallback<UpdateUploadInfoContextType>(
    (key, value) => {
      const prevUploadInfo = component.meta.uploadInfo ?? initialUploadInfo;

      if (!isEqual(prevUploadInfo[key], value)) {
        const updatedUploadInfo: UploadInfoType = {
          ...prevUploadInfo,
          [key]: value,
        };

        if (key === 'database') {
          updatedUploadInfo.schema = undefined;
        }

        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              uploadInfo: updatedUploadInfo,
            },
          },
        });
      }
    },
    [component, updateComponents],
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
});

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
