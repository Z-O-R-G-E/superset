import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  FC,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
} from 'react';
import { isEqual } from 'lodash';
import {
  ComponentFunc,
  UploadDatabaseType,
  UploaderInfoComponentType,
  UploadFieldType,
  UploadInfoType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';

export interface UploadInfoStateContextType {
  component: UploaderInfoComponentType;
  editMode: boolean;
}

export interface UploadInfoStateControllerType {
  updateComponents: ComponentFunc;
  databaseState: UploadDatabaseType;
  setDatabaseState: Dispatch<SetStateAction<UploadDatabaseType>>;
  schemaState: UploadSchemaType;
  setSchemaState: Dispatch<SetStateAction<UploadSchemaType>>;
  tableState: UploadTableType;
  setTableState: Dispatch<SetStateAction<UploadTableType>>;
  fieldsState: UploadFieldType[];
  setFieldsState: Dispatch<SetStateAction<UploadFieldType[]>>;
  updateUploadInfo: <K extends keyof UploadInfoType>(
    key: K,
    value: UploadInfoType[K],
  ) => void;
}

const UploadInfoContext = createContext<UploadInfoStateContextType | undefined>(
  undefined,
);
const UploadInfoControllerContext = createContext<
  UploadInfoStateControllerType | undefined
>(undefined);

UploadInfoContext.displayName = 'UploadInfoContext';
UploadInfoControllerContext.displayName = 'UploadInfoControllerContext';

export const UploadInfoProvider: FC<
  PropsWithChildren<
    UploadInfoStateContextType & {
      updateComponents: ComponentFunc;
    }
  >
> = ({ children, component, updateComponents, editMode }) => {
  const [databaseState, setDatabaseState] = useState(
    component?.uploadInfo?.database ?? { value: undefined, label: '' },
  );
  const [schemaState, setSchemaState] = useState(
    component?.uploadInfo?.schema ?? { value: '', label: '' },
  );
  const [tableState, setTableState] = useState(
    component?.uploadInfo?.table ?? '',
  );
  const [fieldsState, setFieldsState] = useState(
    component?.uploadInfo?.fields ?? [],
  );

  const updateUploadInfo = useCallback(
    <K extends keyof UploadInfoType>(key: K, value: UploadInfoType[K]) => {
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

  const stateValue = useMemo(
    () => ({ component, editMode }),
    [component, editMode],
  );

  const controllerValue = useMemo(
    () => ({
      updateComponents,
      databaseState,
      setDatabaseState,
      schemaState,
      setSchemaState,
      tableState,
      setTableState,
      fieldsState,
      setFieldsState,
      updateUploadInfo,
    }),
    [
      updateComponents,
      databaseState,
      setDatabaseState,
      schemaState,
      setSchemaState,
      tableState,
      setTableState,
      fieldsState,
      setFieldsState,
      updateUploadInfo,
    ],
  );

  return (
    <UploadInfoContext.Provider value={stateValue}>
      <UploadInfoControllerContext.Provider value={controllerValue}>
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
