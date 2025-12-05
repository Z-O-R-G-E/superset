import { useCallback, MouseEvent } from 'react';
import { DataRecordValue } from '@superset-ui/core';
import { PivotDataType } from '../PivotData';

export type ClickHeaderHandlerProps = {
  pivotData: PivotDataType;
  values: DataRecordValue[];
  attrs: string[];
  attrIdx: number;
  callback: (
    e: MouseEvent,
    value: DataRecordValue,
    filters: Record<string, DataRecordValue>,
    pivotData: PivotDataType,
    isSubtotal: boolean,
    isGrandTotal: boolean,
  ) => void;
  isSubtotal: boolean;
  isGrandTotal: boolean;
};

export type ClickHeaderHandlerType = (
  pivotData: PivotDataType,
  values: DataRecordValue[],
  attrs: string[],
  attrIdx: number,
  callback: ClickHeaderHandlerProps['callback'],
  isSubtotal?: boolean,
  isGrandTotal?: boolean,
) => (e: MouseEvent) => void;

export const useClickHeaderHandler = (): ClickHeaderHandlerType =>
  useCallback(
    (
      pivotData,
      values,
      attrs,
      attrIdx,
      callback,
      isSubtotal = false,
      isGrandTotal = false,
    ) => {
      const filters: Record<string, DataRecordValue> = {};

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i <= attrIdx; i++) {
        filters[attrs[i]] = values[i];
      }

      return (e: MouseEvent) =>
        callback(
          e,
          values[attrIdx],
          filters,
          pivotData,
          isSubtotal,
          isGrandTotal,
        );
    },
    [],
  );
