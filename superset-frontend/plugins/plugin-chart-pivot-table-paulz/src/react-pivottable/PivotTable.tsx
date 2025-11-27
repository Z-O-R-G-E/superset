import { FC, memo, useCallback, useMemo, MouseEvent } from 'react';
import {
  CurrencyFormatter,
  DataRecordValue,
  JsonObject,
  NumberFormatter,
} from '@superset-ui/core';
import { usePivotSettings } from './hooks/usePivotSettings';
import { useCollapseState } from './hooks/useCollapseState';
import { ColHeaderRow } from './renderers/ColHeaderRow';
import { Styles } from './Styles';
import { RowHeaderRow } from './renderers/RowHeaderRow';
import { TableRow } from './renderers/TableRow';
import { TotalsRow } from './renderers/TotalsRow';
import { visibleKeys } from './utils';
import { TableOptionsType } from '../hooks/useTableOptions';
import { SubtotalOptionsType } from '../hooks/useSubtotalOptions';
import { useComputedPivotSettings } from './hooks/useComputedPivotSettings';

export type PivotProps = {
  data: { [p: string]: DataRecordValue; value: DataRecordValue }[];
  rows: string[];
  cols: string[];
  defaultFormatter: NumberFormatter | CurrencyFormatter;
  customFormatters: { [p: string]: any } | undefined;
  aggregatorName: string;
  vals: string[];
  colOrder: string;
  rowOrder: string;
  sorters: { [p: string]: (a: any, b: any) => number };
  tableOptions: TableOptionsType;
  subtotalOptions: SubtotalOptionsType;
  namesMapping: JsonObject;
  onContextMenu: (
    e: MouseEvent,
    colKey?: (string | number | boolean)[],
    rowKey?: (string | number | boolean)[],
    dataPoint?: { [p: string]: string },
  ) => void;
};

export const PivotTable: FC<PivotProps> = memo(
  ({ tableOptions, onContextMenu, aggregatorName, ...props }) => {
    const base = usePivotSettings({ ...props, tableOptions, aggregatorName });

    const {
      collapsedRows,
      collapsedCols,
      toggleRowKey,
      toggleColKey,
      collapseAttr,
      expandAttr,
    } = useCollapseState();

    const calcAttrSpans = useCallback((attrArr, numAttrs) => {
      const spans = [];
      const li = Array(numAttrs).fill(0);
      let lv = Array(numAttrs).fill(null);
      for (let i = 0; i < attrArr.length; i += 1) {
        const cv = attrArr[i];
        const ent = [];
        let depth = 0;
        const limit = Math.min(lv.length, cv.length);
        while (depth < limit && lv[depth] === cv[depth]) {
          ent.push(-1);
          spans[li[depth]][depth] += 1;
          depth += 1;
        }
        while (depth < cv.length) {
          li[depth] = i;
          ent.push(1);
          depth += 1;
        }
        spans.push(ent);
        lv = cv;
      }
      return spans;
    }, []);

    const isDashboardEditMode = useCallback(
      () =>
        typeof document !== 'undefined' &&
        document.contains(document.querySelector('.dashboard--editing')),
      [],
    );

    const visibleRowKeys = useMemo(
      () =>
        visibleKeys(
          base.rowKeys,
          collapsedRows,
          base.rowAttrs.length,
          base.rowSubtotalDisplay,
        ),
      [
        base.rowKeys,
        collapsedRows,
        base.rowAttrs.length,
        base.rowSubtotalDisplay,
      ],
    );

    const visibleColKeys = useMemo(
      () =>
        visibleKeys(
          base.colKeys,
          collapsedCols,
          base.colAttrs.length,
          base.colSubtotalDisplay,
        ),
      [
        base.colKeys,
        collapsedCols,
        base.colAttrs.length,
        base.colSubtotalDisplay,
      ],
    );

    const computedPivotSettings = useComputedPivotSettings(
      base,
      visibleRowKeys,
      visibleColKeys,
      calcAttrSpans,
    );

    return (
      <Styles isDashboardEditMode={isDashboardEditMode()}>
        <table className="pvtTable" role="grid">
          <thead>
            {base.colAttrs.map((value: string, index: number) => (
              <ColHeaderRow
                key={`colAttr-${index}`}
                attrName={value}
                attrIdx={index}
                pivotSettings={computedPivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
                collapsedCols={collapsedCols}
                collapseAttr={collapseAttr}
                expandAttr={expandAttr}
                toggleColKey={toggleColKey}
                aggregatorName={aggregatorName}
              />
            ))}
            {base.rowAttrs.length !== 0 && (
              <RowHeaderRow
                pivotSettings={computedPivotSettings}
                tableOptions={tableOptions}
                collapseAttr={collapseAttr}
                expandAttr={expandAttr}
                toggleRowKey={toggleRowKey}
                aggregatorName={aggregatorName}
              />
            )}
          </thead>
          <tbody>
            {visibleRowKeys.map((value: any[], index: number) => (
              <TableRow
                key={`keyRow-${index}`}
                rowKey={value}
                rowIdx={index}
                pivotSettings={computedPivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
                collapsedRows={collapsedRows}
                toggleRowKey={toggleRowKey}
              />
            ))}
            {base.colTotals && (
              <TotalsRow
                pivotSettings={computedPivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
                aggregatorName={aggregatorName}
              />
            )}
          </tbody>
        </table>
      </Styles>
    );
  },
);
