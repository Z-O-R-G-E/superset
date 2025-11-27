import { useMemo } from 'react';
import { PivotSettingsType } from './usePivotSettings';

export type ComputedPivotSettingsType = ReturnType<
  typeof useComputedPivotSettings
>;

export const useComputedPivotSettings = (
  base: PivotSettingsType,
  visibleRowKeys: any[],
  visibleColKeys: any[],
  calcAttrSpans: (attrArr: any, numAttrs: any) => number[][],
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
