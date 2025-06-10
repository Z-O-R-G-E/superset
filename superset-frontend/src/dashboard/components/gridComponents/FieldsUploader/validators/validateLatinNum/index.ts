import { t } from '@superset-ui/core';

export const validateLatinNum = (_: any, value: string) => {
  if (!value) {
    return Promise.resolve();
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
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
