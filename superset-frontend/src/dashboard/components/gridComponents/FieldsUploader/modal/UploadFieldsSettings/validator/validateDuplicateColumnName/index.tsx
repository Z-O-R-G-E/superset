import { t } from '@superset-ui/core';
import { UploadFieldType } from '../../../../types';

export const validateDuplicateColumnName =
  (uploadFields: UploadFieldType[], editFieldIndex: number | null) =>
  (_: any, value: any): Promise<void> => {
    const isDuplicate = uploadFields.some(
      (field, index) => field.name === value && index !== editFieldIndex,
    );
    if (isDuplicate) {
      return Promise.reject(t('Наименование поля уже существует'));
    }
    return Promise.resolve();
  };
