import { t } from '@superset-ui/core';

export const validateStringLength = (
  string: string,
  length: number,
  errorText: string,
) => {
  if (string.length > length) {
    return Promise.reject(new Error(t(errorText)));
  }
  return Promise.resolve();
};
