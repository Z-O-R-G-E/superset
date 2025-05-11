import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  FC,
  PropsWithChildren,
} from 'react';
import { isEqual } from 'lodash';
import {
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldsSettingsFormModalStateType,
  UploadFieldType,
  UploadInfoType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';

export interface UploadInfoStateContextType {
  component: UploaderComponentType;
  editMode: boolean;
}

export interface UploadInfoStateControllerType {
  updateComponents: (updated: Record<string, UploaderComponentType>) => void;
  databaseState: UploadDatabaseType;
  setDatabaseState: React.Dispatch<React.SetStateAction<UploadDatabaseType>>;
  schemaState: UploadSchemaType;
  setSchemaState: React.Dispatch<React.SetStateAction<UploadSchemaType>>;
  tableState: UploadTableType;
  setTableState: React.Dispatch<React.SetStateAction<UploadTableType>>;
  fieldsState: UploadFieldType[];
  setFieldsState: React.Dispatch<React.SetStateAction<UploadFieldType[]>>;
  updateUploadInfo: <K extends keyof UploadInfoType>(
    key: K,
    value: UploadInfoType[K],
  ) => void;
  uploadFieldsSettingsFormModalState: UploadFieldsSettingsFormModalStateType;
  setUploadFieldsSettingsFormModalState: React.Dispatch<
    React.SetStateAction<UploadFieldsSettingsFormModalStateType>
  >;
}

const UploadInfoContext = createContext<UploadInfoStateContextType | undefined>(
  undefined,
);
const UploadInfoControllerContext = createContext<
  UploadInfoStateControllerType | undefined
>(undefined);

UploadInfoContext.displayName = 'UploadInfoContext';
UploadInfoControllerContext.displayName = 'UploadInfoControllerContext';

const useUploadInfoProviderState = (
  component: UploaderComponentType,
  updateComponents: (updated: Record<string, UploaderComponentType>) => void,
) => {
  const uploadInfo = useMemo(() => component.uploadInfo ?? {}, [component]);

  const [databaseState, setDatabaseState] = useState<UploadDatabaseType>(
    uploadInfo.database ?? { value: 0, label: '' },
  );
  const [schemaState, setSchemaState] = useState<UploadSchemaType>(
    uploadInfo.schema ?? { value: '', label: '' },
  );
  const [tableState, setTableState] = useState<UploadTableType>(
    uploadInfo.table ?? '',
  );
  const [fieldsState, setFieldsState] = useState<UploadFieldType[]>(
    uploadInfo.fields ?? [],
  );
  const [
    uploadFieldsSettingsFormModalState,
    setUploadFieldsSettingsFormModalState,
  ] = useState<UploadFieldsSettingsFormModalStateType>({
    isOpen: false,
    editFieldIndex: null,
  });

  useEffect(() => {
    setDatabaseState(uploadInfo.database ?? { value: 0, label: '' });
    setSchemaState(uploadInfo.schema ?? { value: '', label: '' });
    setTableState(uploadInfo.table ?? '');
    setFieldsState(uploadInfo.fields ?? []);
  }, [uploadInfo]);

  const updateUploadInfo = useCallback(
    <K extends keyof UploadInfoType>(key: K, value: UploadInfoType[K]) => {
      const currentValue = uploadInfo[key];
      if (!isEqual(currentValue, value)) {
        updateComponents({
          [component.id]: {
            ...component,
            uploadInfo: {
              ...uploadInfo,
              [key]: value,
            },
          },
        });
      }
    },
    [component, updateComponents, uploadInfo],
  );

  return {
    state: { component, editMode: component.editMode ?? false },
    controller: {
      updateComponents,
      databaseState,
      setDatabaseState,
      schemaState,
      setSchemaState,
      tableState,
      setTableState,
      fieldsState,
      setFieldsState,
      uploadFieldsSettingsFormModalState,
      setUploadFieldsSettingsFormModalState,
      updateUploadInfo,
    },
  };
};

export const UploadInfoProvider: FC<
  PropsWithChildren<{
    component: UploaderComponentType;
    updateComponents: (updated: Record<string, UploaderComponentType>) => void;
    editMode: boolean;
  }>
> = ({ children, component, updateComponents, editMode }) => {
  const { state, controller } = useUploadInfoProviderState(
    component,
    updateComponents,
  );

  const stateValue = useMemo(() => ({ ...state, editMode }), [state, editMode]);

  return (
    <UploadInfoContext.Provider value={stateValue}>
      <UploadInfoControllerContext.Provider value={controller}>
        {children}
      </UploadInfoControllerContext.Provider>
    </UploadInfoContext.Provider>
  );
};

export const useUploadInfo = (): UploadInfoStateContextType => {
  const context = useContext(UploadInfoContext);
  if (!context)
    throw new Error('useUploadInfo must be used within UploadInfoProvider');
  return context;
};

export const useUploadInfoController = (): UploadInfoStateControllerType => {
  const context = useContext(UploadInfoControllerContext);
  if (!context)
    throw new Error(
      'useUploadInfoController must be used within UploadInfoProvider',
    );
  return context;
};
