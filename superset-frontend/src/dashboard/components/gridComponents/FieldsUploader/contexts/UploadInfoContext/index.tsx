import {
  createContext,
  useContext,
  useCallback,
  FC,
  PropsWithChildren,
  useMemo,
  memo,
} from 'react';
import { isEqual } from 'lodash';
import { ComponentType, ComponentFunc, UploadInfoType } from '../../types';

const initialUploadInfo = {
  database: { value: 0, label: '' },
  schema: { value: '', label: '' },
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
  const uploadInfo = useMemo<UploadInfoType>(
    () => component.meta.uploadInfo ?? initialUploadInfo,
    [component.meta.uploadInfo],
  );

  const updateUploadInfo = useCallback<UpdateUploadInfoContextType>(
    (key, value) => {
      if (!isEqual(uploadInfo[key], value)) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              uploadInfo: {
                ...uploadInfo,
                [key]: value,
              },
            },
          },
        });
      }
    },
    [component, updateComponents, uploadInfo],
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

export const useUploadInfo = () => useContext(UploadInfoContext);
export const useUpdateUploadInfo = () => useContext(UpdateUploadInfoContext);
export const useEditMode = () => useContext(EditModeContext);
