import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';
import { useComponentState } from '../../../../contexts/ComponentStateContext';
import { useUploadFieldsManagement } from '../useUploadFieldsManagement';
import { useDataWarehouse } from '../../../../contexts/DataWarehouseContext';

export const useUploadFieldsData = () => {
  const { dbms, database, schema, table, alreadyExists } = useDataWarehouse();
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();
  const { editMode } = useComponentState();
  const { uploadFields, resetUploadFields } = useUploadFieldsManagement();

  return {
    dbms,
    database,
    schema,
    table,
    alreadyExists,
    dayFirst,
    nullValues,
    dataframeIndex,
    indexColumn,
    indexLabel,
    editMode,
    uploadFields,
    resetUploadFields,
  };
};
