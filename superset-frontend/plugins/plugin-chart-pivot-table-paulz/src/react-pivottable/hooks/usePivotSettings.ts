import { useMemo, useCallback } from 'react';
import { flatKey, PivotData } from '../utilities';

type PivotDataProps = any;

const clickHandler = (
  pivotData: any,
  rowValues: any,
  colValues: any,
  colAttrs: any,
  rowAttrs: any,
  clickCallback: any,
) => {
  const value = pivotData.getAggregator(rowValues, colValues).value();
  const filters = {};
  const colLimit = Math.min(colAttrs.length, colValues.length);
  for (let i = 0; i < colLimit; i += 1) {
    const attr = colAttrs[i];
    if (colValues[i] !== null) {
      filters[attr] = colValues[i];
    }
  }
  const rowLimit = Math.min(rowAttrs.length, rowValues.length);
  for (let i = 0; i < rowLimit; i += 1) {
    const attr = rowAttrs[i];
    if (rowValues[i] !== null) {
      filters[attr] = rowValues[i];
    }
  }
  return (e: any) => clickCallback(e, value, filters, pivotData);
};

export function usePivotSettings(props: PivotDataProps) {
  const compute = useCallback(() => {
    const colAttrs = props.cols;
    const rowAttrs = props.rows;

    const tableOptions = {
      rowTotals: true,
      colTotals: true,
      ...props.tableOptions,
    };
    const rowTotals = tableOptions.rowTotals || colAttrs.length === 0;
    const colTotals = tableOptions.colTotals || rowAttrs.length === 0;

    const namesMapping = props.namesMapping || {};
    const subtotalOptions = {
      arrowCollapsed: '\u25B2',
      arrowExpanded: '\u25BC',
      ...props.subtotalOptions,
    };

    const colSubtotalDisplay = {
      displayOnTop: false,
      enabled: tableOptions.colSubTotals,
      hideOnExpand: false,
      ...subtotalOptions.colSubtotalDisplay,
    };

    const rowSubtotalDisplay = {
      displayOnTop: false,
      enabled: tableOptions.rowSubTotals,
      hideOnExpand: false,
      ...subtotalOptions.rowSubtotalDisplay,
    };

    const pivotData = new PivotData(props, {
      rowEnabled: rowSubtotalDisplay.enabled,
      colEnabled: colSubtotalDisplay.enabled,
      rowPartialOnTop: rowSubtotalDisplay.displayOnTop,
      colPartialOnTop: colSubtotalDisplay.displayOnTop,
    });

    const rowKeys = pivotData.getRowKeys();
    const colKeys = pivotData.getColKeys();

    const cellCallbacks = {};
    const rowTotalCallbacks = {};
    const colTotalCallbacks = {};
    let grandTotalCallback = null;

    const clickCallback = props.tableOptions?.clickCallback;
    if (clickCallback) {
      rowKeys.forEach(rowKey => {
        const flatRowKey = flatKey(rowKey);
        if (!(flatRowKey in cellCallbacks)) cellCallbacks[flatRowKey] = {};
        colKeys.forEach(colKey => {
          cellCallbacks[flatRowKey][flatKey(colKey)] = clickHandler(
            pivotData,
            rowKey,
            colKey,
            colAttrs,
            rowAttrs,
            clickCallback,
          );
        });
      });

      if (rowTotals) {
        rowKeys.forEach((rowKey: any[]) => {
          rowTotalCallbacks[flatKey(rowKey)] = clickHandler(
            pivotData,
            rowKey,
            [],
            colAttrs,
            rowAttrs,
            clickCallback,
          );
        });
      }

      if (colTotals) {
        colKeys.forEach((colKey: any[]) => {
          colTotalCallbacks[flatKey(colKey)] = clickHandler(
            pivotData,
            [],
            colKey,
            colAttrs,
            rowAttrs,
            clickCallback,
          );
        });
      }

      if (rowTotals && colTotals) {
        grandTotalCallback = clickHandler(
          pivotData,
          [],
          [],
          colAttrs,
          rowAttrs,
          clickCallback,
        );
      }
    }

    return {
      pivotData,
      colAttrs,
      rowAttrs,
      colKeys,
      rowKeys,
      rowTotals,
      colTotals,
      arrowCollapsed: subtotalOptions.arrowCollapsed,
      arrowExpanded: subtotalOptions.arrowExpanded,
      colSubtotalDisplay,
      rowSubtotalDisplay,
      cellCallbacks,
      rowTotalCallbacks,
      colTotalCallbacks,
      grandTotalCallback,
      namesMapping,
    };
  }, [props]);

  return useMemo(() => compute(), [compute]);
}
