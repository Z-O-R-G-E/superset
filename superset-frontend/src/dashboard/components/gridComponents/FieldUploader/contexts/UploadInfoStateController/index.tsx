import {
  createContext,
  useContext,
  useMemo,
  FC,
  PropsWithChildren,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
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
  updateComponents: Function;
  editMode: boolean;
}

export type UploadInfoStateControllerType = UploadInfoStateContextType & {
  databaseState: UploadDatabaseType;
  setDatabaseState: Dispatch<SetStateAction<UploadDatabaseType>>;
  schemaState: UploadSchemaType;
  setSchemaState: Dispatch<SetStateAction<UploadSchemaType>>;
  tableState: UploadTableType;
  setTableState: Dispatch<SetStateAction<UploadTableType>>;
  fieldsState: UploadFieldType[];
  setFieldsState: Dispatch<SetStateAction<UploadFieldType[]>>;
  uploadFieldsSettingsFormModalState: UploadFieldsSettingsFormModalStateType;
  setUploadFieldsSettingsFormModalState: Dispatch<
    SetStateAction<UploadFieldsSettingsFormModalStateType>
  >;
  updateUploadInfo: <K extends keyof UploadInfoType>(
    key: K,
    value: UploadInfoType[K],
  ) => void;
};

const UploadInfoStateController = createContext<
  UploadInfoStateContextType | undefined
>(undefined);
UploadInfoStateController.displayName = 'UploadInfoStateController';

export const UploadInfoStateControllerProvider: FC<
  PropsWithChildren<UploadInfoStateContextType>
> = ({ children, component, updateComponents, editMode }) => {
  const [databaseState, setDatabaseState] = useState<UploadDatabaseType>(
    component?.uploadInfo?.database ?? { value: 0, label: '' },
  );
  const [schemaState, setSchemaState] = useState<UploadSchemaType>(
    component?.uploadInfo?.schema ?? { value: '', label: '' },
  );
  const [tableState, setTableState] = useState<UploadTableType>(
    component?.uploadInfo?.table ?? '',
  );

  const [fieldsState, setFieldsState] = useState<UploadFieldType[]>(
    component?.uploadInfo?.fields ?? [],
  );
  const [
    uploadFieldsSettingsFormModalState,
    setUploadFieldsSettingsFormModalState,
  ] = useState<UploadFieldsSettingsFormModalStateType>({
    isOpen: false,
    editFieldIndex: null,
  });

  const updateUploadInfo = useCallback(
    <K extends keyof UploaderComponentType['uploadInfo']>(
      key: K,
      value: UploaderComponentType['uploadInfo'][K],
    ) => {
      const current = component.uploadInfo?.[key];
      if (!isEqual(current, value)) {
        updateComponents({
          [component.id]: {
            ...component,
            uploadInfo: {
              ...component.uploadInfo,
              [key]: value,
            },
          },
        });
      }
    },
    [component, updateComponents],
  );

  const contextValue = useMemo<UploadInfoStateControllerType>(
    () => ({
      component,
      updateComponents,
      editMode,
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
    }),
    [
      component,
      updateComponents,
      editMode,
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
    ],
  );

  return (
    <UploadInfoStateController.Provider value={contextValue}>
      {children}
    </UploadInfoStateController.Provider>
  );
};

export const useUploadInfoStateController =
  (): UploadInfoStateControllerType => {
    const context = useContext(
      UploadInfoStateController,
    ) as UploadInfoStateControllerType;
    if (!context) {
      throw new Error(
        'useUploadInfoStateController должен использоваться внутри UploadInfoStateControllerProvider',
      );
    }
    return context;
  };
