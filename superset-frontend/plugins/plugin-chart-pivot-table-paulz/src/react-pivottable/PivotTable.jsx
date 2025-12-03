import React, { useCallback, useMemo, useState } from 'react';
import {
  ColHeaderRow,
  Styles,
  RowHeaderRow,
  TableRow,
  TotalsRow,
} from './components';
import { PivotData } from './PivotData';
import { flatKey } from './utils';

const PivotTable = props => {
  const [collapsedRows, setCollapsedRows] = useState({});
  const [collapsedCols, setCollapsedCols] = useState({});

  const clickHandler = useCallback(
    (pivotData, rowValues, colValues) => {
      const colAttrs = props.cols;
      const rowAttrs = props.rows;
      const value = pivotData.getAggregator(rowValues, colValues).value();
      const filters = {};

      for (let i = 0; i < Math.min(colAttrs.length, colValues.length); i += 1) {
        if (colValues[i] !== null) filters[colAttrs[i]] = colValues[i];
      }
      for (let i = 0; i < Math.min(rowAttrs.length, rowValues.length); i += 1) {
        if (rowValues[i] !== null) filters[rowAttrs[i]] = rowValues[i];
      }

      return e =>
        props.tableOptions.clickCallback(e, value, filters, pivotData);
    },
    [props],
  );

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

      return e =>
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
    (rowOrCol, attrIdx, allKeys) => e => {
      e.stopPropagation();

      const keyLen = attrIdx + 1;
      const collapsed = allKeys.filter(k => k.length === keyLen).map(flatKey);

      const updates = {};
      collapsed.forEach(k => {
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
    (rowOrCol, attrIdx, allKeys) => e => {
      e.stopPropagation();
      const updates = {};

      allKeys.forEach(k => {
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
    flatKeyStr => e => {
      e.stopPropagation();
      setCollapsedRows(prev => ({
        ...prev,
        [flatKeyStr]: !prev[flatKeyStr],
      }));
    },
    [],
  );

  const toggleColKey = useCallback(
    flatKeyStr => e => {
      e.stopPropagation();
      setCollapsedCols(prev => ({
        ...prev,
        [flatKeyStr]: !prev[flatKeyStr],
      }));
    },
    [],
  );

  const getBasePivotSettings = useCallback(() => {
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

    if (tableOptions.clickCallback) {
      rowKeys.forEach(rowKey => {
        const flatRowKey = flatKey(rowKey);
        if (!cellCallbacks[flatRowKey]) cellCallbacks[flatRowKey] = {};

        colKeys.forEach(colKey => {
          cellCallbacks[flatRowKey][flatKey(colKey)] = clickHandler(
            pivotData,
            rowKey,
            colKey,
          );
        });
      });

      if (rowTotals) {
        rowKeys.forEach(rowKey => {
          rowTotalCallbacks[flatKey(rowKey)] = clickHandler(
            pivotData,
            rowKey,
            [],
          );
        });
      }
      if (colTotals) {
        colKeys.forEach(colKey => {
          colTotalCallbacks[flatKey(colKey)] = clickHandler(
            pivotData,
            [],
            colKey,
          );
        });
      }
      if (rowTotals && colTotals) {
        grandTotalCallback = clickHandler(pivotData, [], []);
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
  }, [clickHandler, props]);

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
    (keys, collapsed, numAttrs, subtotalDisplay) =>
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
              tableOptions={props.tableOptions}
              collapseAttr={collapseAttr}
              expandAttr={expandAttr}
              onContextMenu={props.onContextMenu}
              toggleColKey={toggleColKey}
              clickHeaderHandler={clickHeaderHandler}
              cols={props.cols}
              collapsedCols={collapsedCols}
              aggregatorName={props.aggregatorName}
            />
          ))}

          {rowAttrs.length !== 0 && (
            <RowHeaderRow
              pivotSettings={pivotSettings}
              collapseAttr={collapseAttr}
              expandAttr={expandAttr}
              clickHeaderHandler={clickHeaderHandler}
              rows={props.rows}
              clickRowHeaderCallback={props.tableOptions.clickRowHeaderCallback}
              aggregatorName={props.aggregatorName}
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
              tableOptions={props.tableOptions}
              onContextMenu={props.onContextMenu}
              toggleRowKey={toggleRowKey}
              clickHeaderHandler={clickHeaderHandler}
              rows={props.rows}
              collapsedRows={collapsedRows}
            />
          ))}

          {colTotals && (
            <TotalsRow
              pivotSettings={pivotSettings}
              clickHeaderHandler={clickHeaderHandler}
              rows={props.rows}
              clickRowHeaderCallback={props.tableOptions.clickRowHeaderCallback}
              aggregatorName={props.aggregatorName}
              onContextMenu={props.onContextMenu}
            />
          )}
        </tbody>
      </table>
    </Styles>
  );
};

export default PivotTable;
