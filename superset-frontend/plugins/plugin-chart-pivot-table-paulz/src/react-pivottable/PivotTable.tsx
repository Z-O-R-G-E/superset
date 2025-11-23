import { FC, memo, useCallback, useMemo } from 'react';
import {
  CurrencyFormatter,
  JsonObject,
  NumberFormatter,
} from '@superset-ui/core';
import { flatKey } from './utilities';
import { usePivotSettings } from './hooks/usePivotSettings';
import { useCollapseState } from './hooks/useCollapseState';
import { ColHeaderRow } from './renderers/ColHeaderRow';
import { Styles } from './Styles';
import { RowHeaderRow } from './renderers/RowHeaderRow';
import { TableRow } from './renderers/TableRow';
import { TotalsRow } from './renderers/TotalsRow';
import { aggregatorsFactory } from '../constants';

export type PivotProps = {
  data: Record<string, any>[];
  rows: string[];
  cols: string[];
  aggregatorsFactory: typeof aggregatorsFactory;
  defaultFormatter: NumberFormatter | CurrencyFormatter;
  customFormatters: { [p: string]: any } | undefined;
  aggregatorName: string;
  vals: string[];
  colOrder: string;
  rowOrder: string;
  sorters: { [p: string]: (a: any, b: any) => number };
  tableOptions: any;
  subtotalOptions: any;
  namesMapping: JsonObject;
  onContextMenu: (
    e: MouseEvent,
    colKey: (string | number | boolean)[] | undefined,
    rowKey: (string | number | boolean)[] | undefined,
    dataPoint: { [p: string]: string },
  ) => void;
};

function visibleKeys(
  keys: any[],
  collapsed: Record<string, boolean>,
  numAttrs: number,
  subtotalDisplay: any,
) {
  return keys.filter(
    key =>
      !key.some((k: any, j: any) => collapsed[flatKey(key.slice(0, j))]) &&
      (key.length === numAttrs ||
        flatKey(key) in collapsed ||
        !subtotalDisplay.hideOnExpand),
  );
}

export const PivotTable: FC<PivotProps> = memo(
  ({ tableOptions = {}, onContextMenu, ...props }) => {
    const base = usePivotSettings({ ...props, tableOptions });

    const clickHeaderHandler = useCallback(
      (
        pivotData,
        values,
        attrs,
        attrIdx,
        callback,
        isSubtotal = false,
        isGrandTotal = false,
      ) => {
        const filters = {};
        for (let i = 0; i <= attrIdx; i += 1) {
          const attr = attrs[i];
          filters[attr] = values[i];
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

    const pivotSettings = useMemo(
      () => ({
        visibleRowKeys,
        maxRowVisible: Math.max(...visibleRowKeys.map((k: any) => k.length)),
        visibleColKeys,
        maxColVisible: Math.max(...visibleColKeys.map((k: any) => k.length)),
        rowAttrSpans: calcAttrSpans(visibleRowKeys, base.rowAttrs.length),
        colAttrSpans: calcAttrSpans(visibleColKeys, base.colAttrs.length),
        ...base,
        clickHeaderHandler,
      }),
      [visibleRowKeys, visibleColKeys, base, clickHeaderHandler, calcAttrSpans],
    );

    return (
      <Styles isDashboardEditMode={isDashboardEditMode()}>
        <table className="pvtTable" role="grid">
          <thead>
            {base.colAttrs.map((c: any, j: number) => (
              <ColHeaderRow
                key={`colAttr-${j}`}
                attrName={c}
                attrIdx={j}
                pivotSettings={pivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
                collapsedCols={collapsedCols}
                collapseAttr={collapseAttr}
                expandAttr={expandAttr}
                toggleColKey={toggleColKey}
                clickHeaderHandler={clickHeaderHandler}
              />
            ))}
            {base.rowAttrs.length !== 0 && (
              <RowHeaderRow
                pivotSettings={pivotSettings}
                tableOptions={tableOptions}
                clickHeaderHandler={clickHeaderHandler}
                collapseAttr={collapseAttr}
                expandAttr={expandAttr}
                toggleRowKey={toggleRowKey}
              />
            )}
          </thead>
          <tbody>
            {pivotSettings.visibleRowKeys.map((r: any[], i: number) => (
              <TableRow
                key={`keyRow-${i}`}
                rowKey={r}
                rowIdx={i}
                pivotSettings={pivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
                collapsedRows={collapsedRows}
                toggleRowKey={toggleRowKey}
              />
            ))}
            {base.colTotals && (
              <TotalsRow
                pivotSettings={pivotSettings}
                tableOptions={tableOptions}
                onContextMenu={onContextMenu}
              />
            )}
          </tbody>
        </table>
      </Styles>
    );
  },
);
