import { FC, useCallback, useState, MouseEvent } from 'react';
import { DataRecordValue, JsonObject } from '@superset-ui/core';
import {
  ColHeaderRow,
  Styles,
  RowHeaderRow,
  TableRow,
  TotalsRow,
} from './components';
import { flatKey } from './utils';
import { TableOptionsType } from '../hooks/useTableOptions';
import { SubtotalOptionsType } from '../hooks/useSubtotalOptions';
import { FormattersType } from '../hooks/useFormatters';
import { HandleContextMenuType } from '../hooks/useHandleContextMenu';
import { UnpivotedDataType } from '../hooks/usePivotData';
import { useBasePivotSettings } from './hooks/useBasePivotSettings';
import { usePivotSettings } from './hooks/usePivotSettings';

export interface PivotTableProps {
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

  const basePivotSettings = useBasePivotSettings(props);

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

  const calcAttrSpans = useCallback(
    (attrArr: DataRecordValue[][], numAttrs: number) => {
      const spans: number[][] = [];
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
    },
    [],
  );

  const visibleKeys = useCallback(
    (
      keys: DataRecordValue[][],
      collapsed,
      numAttrs: number,
      subtotalDisplay: {
        displayOnTop: boolean;
        enabled: boolean;
        hideOnExpand: boolean;
      },
    ) =>
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

  const visibleRowKeys = visibleKeys(
    basePivotSettings.rowKeys,
    collapsedRows,
    basePivotSettings.rowAttrs.length,
    basePivotSettings.rowSubtotalDisplay,
  );

  const visibleColKeys = visibleKeys(
    basePivotSettings.colKeys,
    collapsedCols,
    basePivotSettings.colAttrs.length,
    basePivotSettings.colSubtotalDisplay,
  );

  const pivotSettings = usePivotSettings({
    visibleRowKeys,
    visibleColKeys,
    calcAttrSpans,
    basePivotSettings,
  });

  return (
    <Styles isDashboardEditMode={isDashboardEditMode()}>
      <table className="pvtTable" role="grid">
        <thead>
          {pivotSettings.colAttrs.map((attrName, attrIdx) => (
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
              cols={props.unpivotedData.cols}
              collapsedCols={collapsedCols}
              aggregatorName={props.aggregatorName}
            />
          ))}

          {pivotSettings.rowAttrs.length !== 0 && (
            <RowHeaderRow
              pivotSettings={pivotSettings}
              collapseAttr={collapseAttr}
              expandAttr={expandAttr}
              clickHeaderHandler={clickHeaderHandler}
              rows={props.unpivotedData.rows}
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
              rows={props.unpivotedData.rows}
              collapsedRows={collapsedRows}
            />
          ))}

          {pivotSettings.colTotals && (
            <TotalsRow
              pivotSettings={pivotSettings}
              clickHeaderHandler={clickHeaderHandler}
              rows={props.unpivotedData.rows}
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
