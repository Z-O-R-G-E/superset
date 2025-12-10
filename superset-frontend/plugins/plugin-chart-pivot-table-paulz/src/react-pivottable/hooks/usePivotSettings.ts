import { DataRecordValue } from '@superset-ui/core';
import { useMemo } from 'react';
import { BasePivotSettingsType } from './useBasePivotSettings';

interface usePivotSettingsProps {
  visibleRowKeys: (number | string | boolean)[][];
  visibleColKeys: (number | string | boolean)[][];
  calcAttrSpans: (attrArr: DataRecordValue[][], numAttrs: number) => number[][];
  basePivotSettings: BasePivotSettingsType;
}

export type PivotSettingsType = ReturnType<typeof usePivotSettings>;

export const usePivotSettings = ({
  visibleRowKeys,
  visibleColKeys,
  calcAttrSpans,
  basePivotSettings,
}: usePivotSettingsProps) =>
  useMemo(
    () => ({
      visibleRowKeys,
      maxRowVisible: Math.max(...visibleRowKeys.map(k => k.length)),
      visibleColKeys,
      maxColVisible: Math.max(...visibleColKeys.map(k => k.length)),
      rowAttrSpans: calcAttrSpans(
        visibleRowKeys,
        basePivotSettings.rowAttrs.length,
      ),
      colAttrSpans: calcAttrSpans(
        visibleColKeys,
        basePivotSettings.colAttrs.length,
      ),
      ...basePivotSettings,
    }),
    [visibleRowKeys, visibleColKeys, calcAttrSpans, basePivotSettings],
  );
