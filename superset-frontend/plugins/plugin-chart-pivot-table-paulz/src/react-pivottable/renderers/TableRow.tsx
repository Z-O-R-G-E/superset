import { FC, memo, MouseEvent } from 'react';
import { t } from '@superset-ui/core';
import { clickHeaderHandler, displayHeaderCell } from '../utils';
import { flatKey } from '../utilities';
import { ComputedPivotSettingsType } from '../hooks/useComputedPivotSettings';
import { TableOptionsType } from '../../hooks/useTableOptions';

type TableRowProps = {
  rowKey: number[];
  rowIdx: number;
  pivotSettings: ComputedPivotSettingsType;
  tableOptions: TableOptionsType;
  onContextMenu: (
    e: MouseEvent,
    colKey?: (string | number | boolean)[],
    rowKey?: (string | number | boolean)[],
    dataPoint?: { [p: string]: string | number | boolean },
  ) => void;
  collapsedRows: Record<string, boolean>;
  toggleRowKey: (flatRowKey: string) => (e?: MouseEvent | undefined) => void;
};

export const TableRow: FC<TableRowProps> = memo(
  ({
    rowKey,
    rowIdx,
    pivotSettings,
    tableOptions,
    onContextMenu,
    collapsedRows,
    toggleRowKey,
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
    } = tableOptions;

    const flatRowKey = flatKey(rowKey);
    const colIncrSpan = colAttrs.length !== 0 ? 1 : 0;

    const attrValueCells = rowKey.map((value, index) => {
      let handleContextMenu;
      let valueCellClassName = 'pvtRowLabel';
      if (!omittedHighlightHeaderGroups.includes(rowAttrs[index])) {
        if (highlightHeaderCellsOnHover) valueCellClassName += ' hoverable';
        handleContextMenu = (e: any) =>
          onContextMenu?.(e, undefined, rowKey, { [rowAttrs[index]]: value });
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
        const flatRowKeyInner = flatKey(rowKey.slice(0, index + 1));
        const colSpan = 1 + (index === rowAttrs.length - 1 ? colIncrSpan : 0);
        const needRowToggle =
          rowSubtotalDisplay.enabled && index !== rowAttrs.length - 1;
        const onArrowClick = needRowToggle
          ? toggleRowKey(flatRowKeyInner)
          : null;

        const headerCellFormattedValue =
          dateFormatters?.[rowAttrs[index]]?.(value) ?? value;

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
              rowAttrs,
              index,
              tableOptions.clickRowHeaderCallback,
            )}
            onContextMenu={handleContextMenu}
          >
            {displayHeaderCell(
              needRowToggle,
              collapsedRows[flatRowKeyInner] ? arrowCollapsed : arrowExpanded,
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
            rowAttrs,
            rowKey.length,
            tableOptions.clickRowHeaderCallback,
            true,
          )}
        >
          {t('Subtotal')}
        </th>
      ) : null;

    const rowClickHandlers = cellCallbacks?.[flatRowKey] || {};
    const valueCells = visibleColKeys.map((colKey: any[]) => {
      const flatColKey = flatKey(colKey);
      const agg = pivotData.getAggregator(rowKey, colKey);
      const aggValue = agg.value();

      const keys = [...rowKey, ...colKey];
      let backgroundColor: any;
      if (cellColorFormatters) {
        Object.values(cellColorFormatters).forEach(cellColorFormatter => {
          if (Array.isArray(cellColorFormatter)) {
            keys.forEach(key => {
              if (backgroundColor) return;
              cellColorFormatter
                .filter(formatter => formatter.column === key)
                .forEach(formatter => {
                  const formatterResult = formatter.getColorFromValue(aggValue);
                  if (formatterResult) backgroundColor = formatterResult;
                });
            });
          }
        });
      }

      const style = agg.isSubtotal
        ? { fontWeight: 'bold' }
        : { backgroundColor };

      return (
        <td
          role="gridcell"
          className="pvtVal"
          key={`pvtVal-${flatColKey}`}
          onClick={rowClickHandlers[flatColKey]}
          onContextMenu={(e: MouseEvent) => onContextMenu?.(e, colKey, rowKey)}
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
          onClick={rowTotalCallbacks?.[flatRowKey]}
          onContextMenu={e => onContextMenu?.(e, undefined, rowKey)}
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
  },
);
TableRow.displayName = 'TableRow';
