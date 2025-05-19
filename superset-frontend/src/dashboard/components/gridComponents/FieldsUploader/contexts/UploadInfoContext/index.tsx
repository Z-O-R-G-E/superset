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

const UploadInfoContext = createContext<UploadInfoType | null>(null);
const UpdateUploadInfoContext =
  createContext<UpdateUploadInfoContextType | null>(null);
const HeaderContext = createContext<HeaderType | null>(null);
const UpdateHeaderContext = createContext<UpdateHeaderContextType | null>(null);
const ComponentInfoContext = createContext<ComponentInfoContextType | null>(
  null,
);

const shallowEqual = <T extends Record<string, unknown>>(
  a: T,
  b: T,
): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

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
        typeof value === 'object' && value !== null
          ? !shallowEqual(
              { [key]: prevUploadInfo[key] } as Partial<UploadInfoType>,
              { [key]: value } as Partial<UploadInfoType>,
            )
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
        typeof value === 'object' && value !== null
          ? !shallowEqual(
              { [key]: prevHeader[key] } as Partial<HeaderType>,
              { [key]: value } as Partial<HeaderType>,
            )
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
> = memo(({ uploadInfo, updateUploadInfo, children }) => {
  const uploadInfoValue = useMemo(() => uploadInfo, [uploadInfo]);
  const updateUploadInfoValue = useMemo(
    () => updateUploadInfo,
    [updateUploadInfo],
  );

  return (
    <UploadInfoContext.Provider value={uploadInfoValue}>
      <UpdateUploadInfoContext.Provider value={updateUploadInfoValue}>
        {children}
      </UpdateUploadInfoContext.Provider>
    </UploadInfoContext.Provider>
  );
});

const HeaderProvider: FC<
  PropsWithChildren<{
    header: HeaderType;
    updateHeader: UpdateHeaderContextType;
  }>
> = memo(({ header, updateHeader, children }) => {
  const headerValue = useMemo(() => header, [header]);
  const updateHeaderValue = useMemo(() => updateHeader, [updateHeader]);

  return (
    <HeaderContext.Provider value={headerValue}>
      <UpdateHeaderContext.Provider value={updateHeaderValue}>
        {children}
      </UpdateHeaderContext.Provider>
    </HeaderContext.Provider>
  );
});

const ComponentInfoProvider: FC<
  PropsWithChildren<{ componentInfo: ComponentInfoContextType }>
> = memo(({ componentInfo, children }) => {
  const componentInfoValue = useMemo(() => componentInfo, [componentInfo]);

  return (
    <ComponentInfoContext.Provider value={componentInfoValue}>
      {children}
    </ComponentInfoContext.Provider>
  );
});

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
  const uploadInfo = useMemo(
    () => component.meta.uploadInfo ?? initialUploadInfo,
    [component.meta.uploadInfo],
  );
  const updateUploadInfo = useOptimizedUpdateUploadInfo(
    component,
    updateComponents,
  );

  const header = useMemo(
    () => component.meta.header ?? initialHeader,
    [component.meta.header],
  );
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
  if (context === null) {
    throw new Error('useUploadInfo must be used within a UploadInfoProvider');
  }
  return context;
};

export const useUpdateUploadInfo = (): UpdateUploadInfoContextType => {
  const context = useContext(UpdateUploadInfoContext);
  if (context === null) {
    throw new Error(
      'useUpdateUploadInfo must be used within a UpdateUploadInfoProvider',
    );
  }
  return context;
};

export const useHeader = (): HeaderType => {
  const context = useContext(HeaderContext);
  if (context === null) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

export const useUpdateHeader = (): UpdateHeaderContextType => {
  const context = useContext(UpdateHeaderContext);
  if (context === null) {
    throw new Error(
      'useUpdateHeader must be used within a UpdateHeaderProvider',
    );
  }
  return context;
};

export const useHeaderField = <K extends keyof HeaderType>(
  field: K,
): HeaderType[K] => {
  const header = useHeader();
  return header[field];
};

export const useComponentInfo = (): ComponentInfoContextType => {
  const context = useContext(ComponentInfoContext);
  if (context === null) {
    throw new Error(
      'useComponentInfo must be used within a ComponentInfoProvider',
    );
  }
  return context;
};

export const useUploadInfoField = <K extends keyof UploadInfoType>(
  field: K,
): UploadInfoType[K] => {
  const uploadInfo = useUploadInfo();
  return uploadInfo[field];
};
