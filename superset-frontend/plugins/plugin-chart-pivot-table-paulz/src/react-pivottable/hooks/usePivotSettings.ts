import { useMemo } from 'react';
import createPivotData from '../PivotData';
import { PivotProps } from '../PivotTable';

type PivotSettingsProps = Omit<PivotProps, 'onContextMenu'>;

export type PivotSettingsType = ReturnType<typeof usePivotSettings>;

export function usePivotSettings(props: PivotSettingsProps) {
  return useMemo(() => {
    const colAttrs = props.cols;
    const rowAttrs = props.rows;

    const tableOptions = {
      ...props.tableOptions,
    };
    const rowTotals = tableOptions.rowTotals || colAttrs.length === 0;
    const colTotals = tableOptions.colTotals || rowAttrs.length === 0;

    const namesMapping = props.namesMapping || {};
    const subtotalOptions = {
      ...props.subtotalOptions,
    };

    const colSubtotalDisplay = {
      enabled: tableOptions.colSubTotals,
      hideOnExpand: false,
      ...subtotalOptions.colSubtotalDisplay,
    };

    const rowSubtotalDisplay = {
      enabled: tableOptions.rowSubTotals,
      hideOnExpand: false,
      ...subtotalOptions.rowSubtotalDisplay,
    };

    const pivotData = createPivotData(props, {
      rowEnabled: rowSubtotalDisplay.enabled,
      colEnabled: colSubtotalDisplay.enabled,
      rowPartialOnTop: rowSubtotalDisplay.displayOnTop,
      colPartialOnTop: colSubtotalDisplay.displayOnTop,
    });

    const { rowKeys, colKeys } = pivotData;

    const cellCallbacks = {};
    const rowTotalCallbacks = {};
    const colTotalCallbacks = {};

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
      namesMapping,
    };
  }, [props]);
}
