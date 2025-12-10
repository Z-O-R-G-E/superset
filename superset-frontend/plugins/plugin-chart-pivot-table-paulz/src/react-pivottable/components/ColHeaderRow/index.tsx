import { DataRecordValue, t } from '@superset-ui/core';
import { FC, MouseEvent } from 'react';
import { displayHeaderCell, flatKey } from '../../utils';
import { TableOptionsType } from '../../../hooks/useTableOptions';
import { HandleContextMenuType } from '../../../hooks/useHandleContextMenu';
import { ClickHeaderHandlerType } from '../../hooks/useClickHeaderHandler';
import { PivotSettingsType } from '../../hooks/usePivotSettings';

interface ColHeaderRowProps {
  attrName: string;
  attrIdx: number;
  pivotSettings: PivotSettingsType;
  tableOptions: TableOptionsType;
  collapseAttr: (
    rowOrCol: boolean,
    attrIdx: number,
    allKeys: DataRecordValue[][],
  ) => (e: MouseEvent) => void;
  expandAttr: (
    rowOrCol: boolean,
    attrIdx: number,
    allKeys: DataRecordValue[][],
  ) => (e: MouseEvent) => void;
  onContextMenu: HandleContextMenuType;
  toggleColKey: (flatKeyStr: string) => (e: MouseEvent) => void;
  clickHeaderHandler: ClickHeaderHandlerType;
  cols: string[];
  collapsedCols: Record<string, boolean>;
  aggregatorName: string;
}

export const ColHeaderRow: FC<ColHeaderRowProps> = ({
  attrName,
  attrIdx,
  pivotSettings,
  tableOptions,
  collapseAttr,
  expandAttr,
  onContextMenu,
  toggleColKey,
  clickHeaderHandler,
  cols,
  collapsedCols,
  aggregatorName,
}) => {
  const {
    rowAttrs,
    colAttrs,
    colKeys,
    visibleColKeys,
    colAttrSpans,
    rowTotals,
    arrowExpanded,
    arrowCollapsed,
    colSubtotalDisplay,
    maxColVisible,
    pivotData,
    namesMapping,
  } = pivotSettings;
  const {
    highlightHeaderCellsOnHover,
    omittedHighlightHeaderGroups = [],
    highlightedHeaderCells,
    dateFormatters,
    clickColumnHeaderCallback,
  } = tableOptions;

  const spaceCell =
    attrIdx === 0 && rowAttrs.length !== 0 ? (
      <th
        key="padding"
        colSpan={rowAttrs.length}
        rowSpan={colAttrs.length}
        aria-hidden="true"
      />
    ) : null;

  const needToggle =
    colSubtotalDisplay.enabled && attrIdx !== colAttrs.length - 1;
  let arrowClickHandle = null;
  let subArrow = null;
  if (needToggle) {
    arrowClickHandle =
      attrIdx + 1 < maxColVisible
        ? collapseAttr(false, attrIdx, colKeys)
        : expandAttr(false, attrIdx, colKeys);
    subArrow = attrIdx + 1 < maxColVisible ? arrowExpanded : arrowCollapsed;
  }
  const attrNameCell = (
    <th key="label" className="pvtAxisLabel">
      {displayHeaderCell(
        needToggle,
        subArrow,
        arrowClickHandle,
        attrName,
        namesMapping,
      )}
    </th>
  );

  const attrValueCells = [];
  const rowIncrSpan = rowAttrs.length !== 0 ? 1 : 0;
  // Iterate through columns. Jump over duplicate values.
  let i = 0;
  while (i < visibleColKeys.length) {
    let handleContextMenu;
    const colKey = visibleColKeys[i];
    const colSpan = attrIdx < colKey.length ? colAttrSpans[i][attrIdx] : 1;
    let colLabelClass = 'pvtColLabel';
    if (attrIdx < colKey.length) {
      if (!omittedHighlightHeaderGroups.includes(colAttrs[attrIdx])) {
        if (highlightHeaderCellsOnHover) {
          colLabelClass += ' hoverable';
        }
        handleContextMenu = (e: MouseEvent) =>
          onContextMenu(e, colKey, undefined, {
            [attrName]: String(colKey[attrIdx]),
          });
      }
      if (
        highlightedHeaderCells &&
        Array.isArray(highlightedHeaderCells[colAttrs[attrIdx]]) &&
        highlightedHeaderCells[colAttrs[attrIdx]].includes(colKey[attrIdx])
      ) {
        colLabelClass += ' active';
      }

      const rowSpan = 1 + (attrIdx === colAttrs.length - 1 ? rowIncrSpan : 0);
      const flatColKey = flatKey(colKey.slice(0, attrIdx + 1));
      const onArrowClick = needToggle ? toggleColKey(flatColKey) : null;

      const headerCellFormattedValue =
        dateFormatters?.[attrName] &&
        typeof dateFormatters[attrName] === 'function'
          ? dateFormatters[attrName]?.(Number(colKey[attrIdx]))
          : colKey[attrIdx];
      attrValueCells.push(
        <th
          className={colLabelClass}
          key={`colKey-${flatColKey}`}
          colSpan={colSpan}
          rowSpan={rowSpan}
          role="columnheader button"
          onClick={clickHeaderHandler(
            pivotData,
            colKey,
            cols,
            attrIdx,
            clickColumnHeaderCallback,
          )}
          onContextMenu={handleContextMenu}
        >
          {displayHeaderCell(
            needToggle,
            collapsedCols[flatColKey] ? arrowCollapsed : arrowExpanded,
            onArrowClick,
            String(headerCellFormattedValue),
            namesMapping,
          )}
        </th>,
      );
    } else if (attrIdx === colKey.length) {
      const rowSpan = colAttrs.length - colKey.length + rowIncrSpan;
      attrValueCells.push(
        <th
          className={`${colLabelClass} pvtSubtotalLabel`}
          key={`colKeyBuffer-${flatKey(colKey)}`}
          colSpan={colSpan}
          rowSpan={rowSpan}
          role="columnheader button"
          onClick={clickHeaderHandler(
            pivotData,
            colKey,
            cols,
            attrIdx,
            clickColumnHeaderCallback,
            true,
          )}
        >
          {t('Subtotal')}
        </th>,
      );
    }
    // The next colSpan columns will have the same value anyway...
    i += colSpan;
  }

  const totalCell =
    attrIdx === 0 && rowTotals ? (
      <th
        key="total"
        className="pvtTotalLabel"
        rowSpan={colAttrs.length + Math.min(rowAttrs.length, 1)}
        role="columnheader button"
        onClick={clickHeaderHandler(
          pivotData,
          [],
          cols,
          attrIdx,
          clickColumnHeaderCallback,
          false,
          true,
        )}
      >
        {t('Total (%(aggregatorName)s)', {
          aggregatorName: t(aggregatorName),
        })}
      </th>
    ) : null;

  const cells = [spaceCell, attrNameCell, ...attrValueCells, totalCell];
  return <tr key={`colAttr-${attrIdx}`}>{cells}</tr>;
};
