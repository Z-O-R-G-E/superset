import { useMemo } from 'react';
import { createPivotData, PivotDataType } from '../PivotData';
import { PivotTableProps } from '../PivotTable';

export type BasePivotSettingsType = ReturnType<typeof useBasePivotSettings>;

export const useBasePivotSettings = (props: PivotTableProps) =>
  useMemo(() => {
    const { unpivotedData, tableOptions, subtotalOptions, namesMapping } =
      props;
    const { cols, rows } = unpivotedData;

    const colAttrs = cols;
    const rowAttrs = rows;

    const rowTotals = tableOptions.rowTotals || colAttrs.length === 0;
    const colTotals = tableOptions.colTotals || rowAttrs.length === 0;

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

    const pivotData: PivotDataType = createPivotData(props, {
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
