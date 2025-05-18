import {
  createContext,
  useContext,
  useCallback,
  FC,
  PropsWithChildren,
  memo,
  Dispatch,
  SetStateAction,
  useMemo,
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

type ComponentInfoContextType = {
  editMode: boolean;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
};

const UploadInfoContext = createContext<UploadInfoType>(initialUploadInfo);
const UpdateUploadInfoContext = createContext<UpdateUploadInfoContextType>(
  () => {},
);
const ComponentInfoContext = createContext<ComponentInfoContextType>({
  editMode: false,
  setDisableDragDrop: () => {},
});

interface ComponentStateProviderProps {
  component: ComponentType;
  updateComponents: ComponentFunc;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  editMode: boolean;
}

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderProps>
> = memo(
  ({ children, component, updateComponents, setDisableDragDrop, editMode }) => {
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

    const componentInfo = useMemo(
      () => ({
        editMode,
        setDisableDragDrop,
      }),
      [editMode, setDisableDragDrop],
    );

    return (
      <UploadInfoContext.Provider value={uploadInfo}>
        <UpdateUploadInfoContext.Provider value={updateUploadInfo}>
          <ComponentInfoContext.Provider value={componentInfo}>
            {children}
          </ComponentInfoContext.Provider>
        </UpdateUploadInfoContext.Provider>
      </UploadInfoContext.Provider>
    );
  },
);

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

export const useComponentInfo = (): ComponentInfoContextType => {
  const context = useContext(ComponentInfoContext);
  if (context === undefined) {
    throw new Error(
      'useComponentInfo must be used within ComponentStateProvider',
    );
  }
  return context;
};
