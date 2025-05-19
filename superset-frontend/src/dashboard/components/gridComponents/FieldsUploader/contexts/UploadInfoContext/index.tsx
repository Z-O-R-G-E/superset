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
import {
  ComponentType,
  ComponentFunc,
  UploadInfoType,
  HeaderType,
} from '../../types';

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

type UpdateHeaderContextType = <K extends keyof HeaderType>(
  key: K,
  value: HeaderType[K],
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

const initialHeader: HeaderType = {
  active: false,
  label: '',
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
const HeaderContext = createContext<HeaderType>(initialHeader);
const UpdateHeaderContext = createContext<UpdateHeaderContextType>(() => {});
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

const useOptimizedUpdateHeader = (
  component: ComponentType,
  updateComponents: ComponentFunc,
) =>
  useCallback<UpdateHeaderContextType>(
    (key, value) => {
      const prevHeader = component.meta.header ?? initialHeader;

      if (prevHeader[key] === value) return;

      const shouldUpdate =
        typeof value === 'object'
          ? !shallowEqual(prevHeader[key], value)
          : true;

      if (shouldUpdate) {
        const updatedHeader: HeaderType = {
          ...prevHeader,
          [key]: value,
        };

        if (key === 'active' && value === false) {
          updatedHeader.label = '';
        }

        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              header: updatedHeader,
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

const HeaderProvider: FC<
  PropsWithChildren<{
    header: HeaderType;
    updateHeader: UpdateHeaderContextType;
  }>
> = memo(({ header, updateHeader, children }) => (
  <HeaderContext.Provider value={header}>
    <UpdateHeaderContext.Provider value={updateHeader}>
      {children}
    </UpdateHeaderContext.Provider>
  </HeaderContext.Provider>
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

  const header = component.meta.header ?? initialHeader;
  const updateHeader = useOptimizedUpdateHeader(component, updateComponents);

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
      <HeaderProvider header={header} updateHeader={updateHeader}>
        <ComponentInfoProvider componentInfo={componentInfo}>
          {children}
        </ComponentInfoProvider>
      </HeaderProvider>
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

export const useHeader = (): HeaderType => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within ComponentStateProvider');
  }
  return context;
};

export const useUpdateHeader = (): UpdateHeaderContextType => {
  const context = useContext(UpdateHeaderContext);
  if (context === undefined) {
    throw new Error(
      'useUpdateHeader must be used within ComponentStateProvider',
    );
  }
  return context;
};

export const useHeaderField = <K extends keyof HeaderType>(
  field: K,
): HeaderType[K] => {
  const header = useHeader();
  return useMemo(() => header[field], [header, field]);
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
