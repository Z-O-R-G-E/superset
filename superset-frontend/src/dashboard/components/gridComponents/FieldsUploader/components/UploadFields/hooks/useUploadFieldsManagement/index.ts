import { useCallback } from 'react';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../../../contexts/UploadFieldsContext';

export const useUploadFieldsManagement = () => {
  const uploadFields = useUploadFields();
  const updateUploadFields = useUpdateUploadFields();

  const removeField = useCallback(
    (index: number) =>
      updateUploadFields(uploadFields.filter((_, i) => i !== index)),
    [uploadFields, updateUploadFields],
  );

  const editField = useCallback(
    (index: number) => ({ isOpen: true, editFieldIndex: index }),
    [],
  );

  const onWidthChange = useCallback(
    (index: number, newWidth: number) =>
      updateUploadFields(
        uploadFields.map((field, i) =>
          i === index ? { ...field, width: newWidth } : field,
        ),
      ),
    [uploadFields, updateUploadFields],
  );

  const resetUploadFields = useCallback(
    () =>
      updateUploadFields(uploadFields.map(field => ({ ...field, value: '' }))),
    [uploadFields, updateUploadFields],
  );

  return {
    uploadFields,
    removeField,
    editField,
    onWidthChange,
    resetUploadFields,
  };
};
