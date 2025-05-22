import { t } from '@superset-ui/core';
import { spaceReplace } from '../../spaceReplace';

export const validateLatinNumNoSpaces = (_: any, value: string) => {
  const processedValue = spaceReplace(value).toLowerCase();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(processedValue)) {
    return Promise.reject(
      new Error(
        t(
          'Название должно начинаться с латинской буквы или _ и содержать только латинские буквы, цифры и _',
        ),
      ),
    );
  }
  return Promise.resolve();
};
