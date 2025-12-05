import { DataRecordValue } from '@superset-ui/core';

export const flatKey = (attrVals: DataRecordValue[]) =>
  attrVals.join(String.fromCharCode(0));
