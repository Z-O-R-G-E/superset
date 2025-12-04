import { FC, useCallback, useMemo, useState, MouseEvent } from 'react';
import { DataRecordValue, JsonObject } from '@superset-ui/core';
import {
  ColHeaderRow,
  Styles,
  RowHeaderRow,
  TableRow,
  TotalsRow,
} from './components';
import { createPivotData, PivotDataType } from './PivotData';
import { flatKey } from './utils';
import { TableOptionsType } from '../hooks/useTableOptions';
import { SubtotalOptionsType } from '../hooks/useSubtotalOptions';
import { FormattersType } from '../hooks/useFormatters';
import { HandleContextMenuType } from '../hooks/useHandleContextMenu';
import { UnpivotedDataType } from '../hooks/usePivotData';

interface PivotTableProps {
  unpivotedData: UnpivotedDataType;
  formatters: FormattersType;
  aggregatorName: string;
  colOrder: string;
  rowOrder: string;
  tableOptions: TableOptionsType;
  subtotalOptions: SubtotalOptionsType;
  namesMapping: JsonObject;
  onContextMenu: HandleContextMenuType;
}

const PivotTable: FC<PivotTableProps> = props => {
  const [collapsedRows, setCollapsedRows] = useState({});
  const [collapsedCols, setCollapsedCols] = useState({});

  const {
    unpivotedData,
    tableOptions,
    namesMapping,
    subtotalOptions,
    onContextMenu,
    aggregatorName,
  } = props;

  const { cols, rows } = unpivotedData;

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
      for (let i = 0; i <= attrIdx; i += 1) filters[attrs[i]] = values[i];

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

  const collapseAttr = useCallback(
    (rowOrCol: boolean, attrIdx: number, allKeys) => (e: MouseEvent) => {
      e.stopPropagation();

      const keyLen = attrIdx + 1;
      const collapsed = allKeys
        .filter((k: any) => k.length === keyLen)
        .map(flatKey);

      const updates = {};
      collapsed.forEach((k: any) => {
        updates[k] = true;
      });

      if (rowOrCol) {
        setCollapsedRows(prev => ({ ...prev, ...updates }));
      } else {
        setCollapsedCols(prev => ({ ...prev, ...updates }));
      }
    },
    [],
  );

  const expandAttr = useCallback(
    (rowOrCol, attrIdx, allKeys) => (e: MouseEvent) => {
      e.stopPropagation();
      const updates = {};

      allKeys.forEach((k: any) => {
        for (let i = 0; i <= attrIdx; i += 1) {
          updates[flatKey(k.slice(0, i + 1))] = false;
        }
      });

      if (rowOrCol) {
        setCollapsedRows(prev => ({ ...prev, ...updates }));
      } else {
        setCollapsedCols(prev => ({ ...prev, ...updates }));
      }
    },
    [],
  );

  const toggleRowKey = useCallback(
    flatKeyStr => (e: MouseEvent) => {
      e.stopPropagation();
      setCollapsedRows(prev => ({
        ...prev,
        [flatKeyStr]: !prev[flatKeyStr],
      }));
    },
    [],
  );

  const toggleColKey = useCallback(
    flatKeyStr => (e: MouseEvent) => {
      e.stopPropagation();
      setCollapsedCols(prev => ({
        ...prev,
        [flatKeyStr]: !prev[flatKeyStr],
      }));
    },
    [],
  );

  const getBasePivotSettings = useCallback(() => {
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
    const grandTotalCallback = null;

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
  }, []);

  const basePivotSettings = useMemo(
    () => getBasePivotSettings(),
    [getBasePivotSettings],
  );

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

  const visibleKeys = useCallback(
    (keys: DataRecordValue[][], collapsed, numAttrs: number, subtotalDisplay) =>
      keys.filter(
        key =>
          !key.some((_, j) => collapsed[flatKey(key.slice(0, j))]) &&
          (key.length === numAttrs ||
            flatKey(key) in collapsed ||
            !subtotalDisplay.hideOnExpand),
      ),
    [],
  );

  const isDashboardEditMode = () =>
    document.contains(document.querySelector('.dashboard--editing'));

  const {
    colAttrs,
    rowAttrs,
    rowKeys,
    colKeys,
    colTotals,
    rowSubtotalDisplay,
    colSubtotalDisplay,
  } = basePivotSettings;

  const visibleRowKeys = visibleKeys(
    rowKeys,
    collapsedRows,
    rowAttrs.length,
    rowSubtotalDisplay,
  );

  const visibleColKeys = visibleKeys(
    colKeys,
    collapsedCols,
    colAttrs.length,
    colSubtotalDisplay,
  );

  const pivotSettings = {
    visibleRowKeys,
    maxRowVisible: Math.max(...visibleRowKeys.map(k => k.length)),
    visibleColKeys,
    maxColVisible: Math.max(...visibleColKeys.map(k => k.length)),
    rowAttrSpans: calcAttrSpans(visibleRowKeys, rowAttrs.length),
    colAttrSpans: calcAttrSpans(visibleColKeys, colAttrs.length),
    ...basePivotSettings,
  };

  return (
    <Styles isDashboardEditMode={isDashboardEditMode()}>
      <table className="pvtTable" role="grid">
        <thead>
          {colAttrs.map((attrName, attrIdx) => (
            <ColHeaderRow
              key={`colAttr-${attrIdx}`}
              attrName={attrName}
              attrIdx={attrIdx}
              pivotSettings={pivotSettings}
              tableOptions={tableOptions}
              collapseAttr={collapseAttr}
              expandAttr={expandAttr}
              onContextMenu={onContextMenu}
              toggleColKey={toggleColKey}
              clickHeaderHandler={clickHeaderHandler}
              cols={cols}
              collapsedCols={collapsedCols}
              aggregatorName={aggregatorName}
            />
          ))}

          {rowAttrs.length !== 0 && (
            <RowHeaderRow
              pivotSettings={pivotSettings}
              collapseAttr={collapseAttr}
              expandAttr={expandAttr}
              clickHeaderHandler={clickHeaderHandler}
              rows={rows}
              clickRowHeaderCallback={tableOptions.clickRowHeaderCallback}
              aggregatorName={aggregatorName}
            />
          )}
        </thead>

        <tbody>
          {visibleRowKeys.map((rowKey, rowIdx) => (
            <TableRow
              key={`keyRow-${rowKey}-${rowIdx}`}
              rowKey={rowKey}
              rowIdx={rowIdx}
              pivotSettings={pivotSettings}
              tableOptions={tableOptions}
              onContextMenu={onContextMenu}
              toggleRowKey={toggleRowKey}
              clickHeaderHandler={clickHeaderHandler}
              rows={rows}
              collapsedRows={collapsedRows}
            />
          ))}

          {colTotals && (
            <TotalsRow
              pivotSettings={pivotSettings}
              clickHeaderHandler={clickHeaderHandler}
              rows={rows}
              clickRowHeaderCallback={tableOptions.clickRowHeaderCallback}
              aggregatorName={aggregatorName}
              onContextMenu={onContextMenu}
            />
          )}
        </tbody>
      </table>
    </Styles>
  );
};

export default PivotTable;
