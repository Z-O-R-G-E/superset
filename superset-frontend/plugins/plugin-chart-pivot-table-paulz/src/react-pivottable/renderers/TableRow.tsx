import { FC, memo, MouseEvent } from 'react';
import { t } from '@superset-ui/core';
import { clickHeaderHandler, displayHeaderCell } from '../utils';
import { flatKey } from '../utilities';
import { ComputedPivotSettingsType } from '../hooks/useComputedPivotSettings';
import { TableOptionsType } from '../../hooks/useTableOptions';

type Props = {
  rowKey: any[];
  rowIdx: number;
  pivotSettings: ComputedPivotSettingsType;
  tableOptions: TableOptionsType;
  onContextMenu: (
    e: MouseEvent,
    colKey?: (string | number | boolean)[],
    rowKey?: (string | number | boolean)[],
    dataPoint?: { [p: string]: string },
  ) => void;
  collapsedRows: Record<string, boolean>;
  toggleRowKey: (flatRowKey: string) => (e?: MouseEvent | undefined) => void;
};

export const TableRow: FC<Props> = memo(
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

    const attrValueCells = rowKey.map((r, i) => {
      let handleContextMenu;
      let valueCellClassName = 'pvtRowLabel';
      if (!omittedHighlightHeaderGroups.includes(rowAttrs[i])) {
        if (highlightHeaderCellsOnHover) valueCellClassName += ' hoverable';
        handleContextMenu = (e: any) =>
          onContextMenu?.(e, undefined, rowKey, { [rowAttrs[i]]: r });
      }
      if (
        highlightedHeaderCells &&
        Array.isArray(highlightedHeaderCells[rowAttrs[i]]) &&
        highlightedHeaderCells[rowAttrs[i]].includes(r)
      ) {
        valueCellClassName += ' active';
      }

      const rowSpan = rowAttrSpans[rowIdx][i];
      if (rowSpan > 0) {
        const flatRowKeyInner = flatKey(rowKey.slice(0, i + 1));
        const colSpan = 1 + (i === rowAttrs.length - 1 ? colIncrSpan : 0);
        const needRowToggle =
          rowSubtotalDisplay.enabled && i !== rowAttrs.length - 1;
        const onArrowClick = needRowToggle
          ? toggleRowKey(flatRowKeyInner)
          : null;

        const headerCellFormattedValue =
          dateFormatters?.[rowAttrs[i]]?.(r) ?? r;

        return (
          <th
            key={`rowKeyLabel-${i}`}
            className={valueCellClassName}
            rowSpan={rowSpan}
            colSpan={colSpan}
            role="columnheader button"
            onClick={clickHeaderHandler(
              pivotData,
              rowKey,
              rowAttrs,
              i,
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
