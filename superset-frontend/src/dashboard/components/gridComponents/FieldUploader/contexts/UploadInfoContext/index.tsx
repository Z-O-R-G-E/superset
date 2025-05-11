import {
  createContext,
  useContext,
  useState,
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
  const uploadInfo = component.uploadInfo ?? {};

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
  }, [
    component,
    uploadInfo.database,
    uploadInfo.fields,
    uploadInfo.schema,
    uploadInfo.table,
  ]);

  const updateUploadInfo = useCallback(
    <K extends keyof UploadInfoType>(key: K, value: UploadInfoType[K]) => {
      const currentUploadInfo = component.uploadInfo ?? {};
      if (!isEqual(currentUploadInfo[key], value)) {
        updateComponents({
          [component.id]: {
            ...component,
            uploadInfo: {
              ...currentUploadInfo,
              [key]: value,
            },
          },
        });
      }
    },
    [component, updateComponents],
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
  }>
> = ({ children, component, updateComponents }) => {
  const { state, controller } = useUploadInfoProviderState(
    component,
    updateComponents,
  );

  return (
    <UploadInfoContext.Provider value={state}>
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
