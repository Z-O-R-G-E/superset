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
import { ComponentType, ComponentFunc, UploadInfoType } from '../../types';

interface ComponentStateProviderProps {
  component: ComponentType;
  updateComponents: ComponentFunc;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  columnWidth: number;
  widthMultiple: number;
  editMode: boolean;
}

type UpdateUploadInfoContextType = <K extends keyof UploadInfoType>(
  key: K,
  value: UploadInfoType[K],
) => void;

type ComponentInfoContextType = {
  editMode: boolean;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  columnWidth: number;
  widthMultiple: number;
};

const initialUploadInfo: UploadInfoType = {
  database: undefined,
  schema: undefined,
  table: '',
  fields: [],
};

const initialComponentInfo: ComponentInfoContextType = {
  editMode: false,
  setDisableDragDrop: () => {},
  columnWidth: 0,
  widthMultiple: 0,
};

const UploadInfoContext = createContext<UploadInfoType>(initialUploadInfo);
const UpdateUploadInfoContext = createContext<UpdateUploadInfoContextType>(
  () => {},
);
const ComponentInfoContext =
  createContext<ComponentInfoContextType>(initialComponentInfo);

const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => a[key] === b[key]);
};

const useOptimizedUpdateUploadInfo = (
  component: ComponentType,
  updateComponents: ComponentFunc,
) =>
  useCallback<UpdateUploadInfoContextType>(
    (key, value) => {
      const prevUploadInfo = component.meta.uploadInfo ?? initialUploadInfo;

      if (prevUploadInfo[key] === value) return;

      const shouldUpdate =
        typeof value === 'object'
          ? !shallowEqual(prevUploadInfo[key], value)
          : true;

      if (shouldUpdate) {
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

const UploadInfoProvider: FC<
  PropsWithChildren<{
    uploadInfo: UploadInfoType;
    updateUploadInfo: UpdateUploadInfoContextType;
  }>
> = memo(({ uploadInfo, updateUploadInfo, children }) => (
  <UploadInfoContext.Provider value={uploadInfo}>
    <UpdateUploadInfoContext.Provider value={updateUploadInfo}>
      {children}
    </UpdateUploadInfoContext.Provider>
  </UploadInfoContext.Provider>
));

const ComponentInfoProvider: FC<
  PropsWithChildren<{ componentInfo: ComponentInfoContextType }>
> = memo(({ componentInfo, children }) => (
  <ComponentInfoContext.Provider value={componentInfo}>
    {children}
  </ComponentInfoContext.Provider>
));

export const ComponentStateProvider: FC<
  PropsWithChildren<ComponentStateProviderProps>
> = ({
  children,
  component,
  updateComponents,
  setDisableDragDrop,
  columnWidth,
  widthMultiple,
  editMode,
}) => {
  const uploadInfo = component.meta.uploadInfo ?? initialUploadInfo;
  const updateUploadInfo = useOptimizedUpdateUploadInfo(
    component,
    updateComponents,
  );

  const componentInfo = useMemo(
    () => ({
      editMode,
      setDisableDragDrop,
      columnWidth,
      widthMultiple,
    }),
    [editMode, setDisableDragDrop, columnWidth, widthMultiple],
  );

  return (
    <UploadInfoProvider
      uploadInfo={uploadInfo}
      updateUploadInfo={updateUploadInfo}
    >
      <ComponentInfoProvider componentInfo={componentInfo}>
        {children}
      </ComponentInfoProvider>
    </UploadInfoProvider>
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

export const useComponentInfo = (): ComponentInfoContextType => {
  const context = useContext(ComponentInfoContext);
  if (context === undefined) {
    throw new Error(
      'useComponentInfo must be used within ComponentStateProvider',
    );
  }
  return context;
};

export const useUploadInfoField = <K extends keyof UploadInfoType>(
  field: K,
): UploadInfoType[K] => {
  const uploadInfo = useUploadInfo();
  return useMemo(() => uploadInfo[field], [uploadInfo, field]);
};
