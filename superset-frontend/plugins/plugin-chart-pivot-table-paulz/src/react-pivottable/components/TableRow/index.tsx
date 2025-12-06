import { DataRecordValue, t } from '@superset-ui/core';
import { FC, MouseEvent } from 'react';
import { displayHeaderCell, flatKey } from '../../utils';
import { TableOptionsType } from '../../../hooks/useTableOptions';
import { HandleContextMenuType } from '../../../hooks/useHandleContextMenu';
import { ClickHeaderHandlerType } from '../../hooks/useClickHeaderHandler';
import { PivotSettingsType } from '../../hooks/usePivotSettings';

interface TableRowProps {
  rowKey: DataRecordValue[];
  rowIdx: number;
  pivotSettings: PivotSettingsType;
  tableOptions: TableOptionsType;
  onContextMenu: HandleContextMenuType;
  toggleRowKey: (flatKeyStr: string) => (e: MouseEvent) => void;
  clickHeaderHandler: ClickHeaderHandlerType;
  rows: string[];
  collapsedRows: Record<string, boolean>;
}

export const TableRow: FC<TableRowProps> = ({
  rowKey,
  rowIdx,
  pivotSettings,
  tableOptions,
  onContextMenu,
  toggleRowKey,
  clickHeaderHandler,
  rows,
  collapsedRows,
}) => {
  const {
    rowAttrs,
    colAttrs,
    rowAttrSpans,
    visibleColKeys,
    pivotData,
    rowTotals,
    rowSubtotalDisplay,
    arrowExpanded,
    arrowCollapsed,
    cellCallbacks,
    rowTotalCallbacks,
    namesMapping,
  } = pivotSettings;

  const {
    highlightHeaderCellsOnHover,
    omittedHighlightHeaderGroups = [],
    highlightedHeaderCells,
    cellColorFormatters,
    dateFormatters,
    clickRowHeaderCallback,
  } = tableOptions;
  const flatRowKey = flatKey(rowKey);

  const colIncrSpan = colAttrs.length !== 0 ? 1 : 0;
  const attrValueCells = rowKey.map((value: any, index: number) => {
    let handleContextMenu;
    let valueCellClassName = 'pvtRowLabel';
    if (!omittedHighlightHeaderGroups.includes(rowAttrs[index])) {
      if (highlightHeaderCellsOnHover) {
        valueCellClassName += ' hoverable';
      }
      handleContextMenu = (e: MouseEvent) =>
        onContextMenu(e, undefined, rowKey, {
          [rowAttrs[index]]: value,
        });
    }
    if (
      highlightedHeaderCells &&
      Array.isArray(highlightedHeaderCells[rowAttrs[index]]) &&
      highlightedHeaderCells[rowAttrs[index]].includes(value)
    ) {
      valueCellClassName += ' active';
    }
    const rowSpan = rowAttrSpans[rowIdx][index];
    if (rowSpan > 0) {
      const flatRowKey = flatKey(rowKey.slice(0, index + 1));
      const colSpan = 1 + (index === rowAttrs.length - 1 ? colIncrSpan : 0);
      const needRowToggle =
        rowSubtotalDisplay.enabled && index !== rowAttrs.length - 1;
      const onArrowClick = needRowToggle ? toggleRowKey(flatRowKey) : null;

      const headerCellFormattedValue = dateFormatters?.[rowAttrs[index]]
        ? dateFormatters[rowAttrs[index]]?.(value)
        : value;
      return (
        <th
          key={`rowKeyLabel-${index}`}
          className={valueCellClassName}
          rowSpan={rowSpan}
          colSpan={colSpan}
          role="columnheader button"
          onClick={clickHeaderHandler(
            pivotData,
            rowKey,
            rows,
            index,
            clickRowHeaderCallback,
          )}
          onContextMenu={handleContextMenu}
        >
          {displayHeaderCell(
            needRowToggle,
            collapsedRows[flatRowKey] ? arrowCollapsed : arrowExpanded,
            onArrowClick,
            headerCellFormattedValue,
            namesMapping,
          )}
        </th>
      );
    }
    return null;
  });

  const attrValuePaddingCell =
    rowKey.length < rowAttrs.length ? (
      <th
        className="pvtRowLabel pvtSubtotalLabel"
        key="rowKeyBuffer"
        colSpan={rowAttrs.length - rowKey.length + colIncrSpan}
        rowSpan={1}
        role="columnheader button"
        onClick={clickHeaderHandler(
          pivotData,
          rowKey,
          rows,
          rowKey.length,
          clickRowHeaderCallback,
          true,
        )}
      >
        {t('Subtotal')}
      </th>
    ) : null;

  const rowClickHandlers = cellCallbacks[flatRowKey] || {};
  const valueCells = visibleColKeys.map((colKey: DataRecordValue[]) => {
    const flatColKey = flatKey(colKey);
    const agg = pivotData.getAggregator(rowKey, colKey);
    const aggValue = agg.value();

    const keys = [...rowKey, ...colKey];
    let backgroundColor: string | undefined;
    if (cellColorFormatters) {
      Object.values(cellColorFormatters).forEach(cellColorFormatter => {
        if (Array.isArray(cellColorFormatter)) {
          keys.forEach(key => {
            if (backgroundColor) {
              return;
            }
            cellColorFormatter
              .filter(formatter => formatter.column === key)
              .forEach(formatter => {
                const formatterResult = formatter.getColorFromValue(aggValue);
                if (formatterResult) {
                  backgroundColor = formatterResult;
                }
              });
          });
        }
      });
    }

    const style = agg.isSubtotal ? { fontWeight: 'bold' } : { backgroundColor };

    return (
      <td
        role="gridcell"
        className="pvtVal"
        key={`pvtVal-${flatColKey}`}
        onClick={rowClickHandlers[flatColKey]}
        onContextMenu={e => onContextMenu(e, colKey, rowKey)}
        style={style}
      >
        {agg.format(aggValue)}
      </td>
    );
  });

  let totalCell = null;
  if (rowTotals) {
    const agg = pivotData.getAggregator(rowKey, []);
    const aggValue = agg.value();
    totalCell = (
      <td
        role="gridcell"
        key="total"
        className="pvtTotal"
        onClick={rowTotalCallbacks[flatRowKey]}
        onContextMenu={e => onContextMenu(e, undefined, rowKey)}
      >
        {agg.format(aggValue)}
      </td>
    );
  }

  const rowCells = [
    ...attrValueCells,
    attrValuePaddingCell,
    ...valueCells,
    totalCell,
  ];

  return <tr key={`keyRow-${flatRowKey}`}>{rowCells}</tr>;
};
