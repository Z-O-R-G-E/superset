import { useMemo } from 'react';
import { DataRecordValue } from '@superset-ui/core';
import { PivotSettingsType } from './usePivotSettings';

export type ComputedPivotSettingsType = ReturnType<
  typeof useComputedPivotSettings
>;

export const useComputedPivotSettings = (
  base: PivotSettingsType,
  visibleRowKeys: DataRecordValue[][],
  visibleColKeys: DataRecordValue[][],
  calcAttrSpans: (attrArr: DataRecordValue[][], numAttrs: number) => number[][],
) =>
  useMemo(
    () => ({
      visibleRowKeys,
      maxRowVisible: Math.max(...visibleRowKeys.map((k: any) => k.length)),
      visibleColKeys,
      maxColVisible: Math.max(...visibleColKeys.map((k: any) => k.length)),
      rowAttrSpans: calcAttrSpans(visibleRowKeys, base.rowAttrs.length),
      colAttrSpans: calcAttrSpans(visibleColKeys, base.colAttrs.length),
      ...base,
    }),
    [visibleRowKeys, visibleColKeys, base, calcAttrSpans],
  );
