import { FC, memo } from 'react';
import { t } from '@superset-ui/core';
import { flatKey } from '../utilities';
import { displayHeaderCell } from '../utils';

type Props = {
  attrName: any;
  attrIdx: number;
  pivotSettings: any;
  tableOptions: any;
  onContextMenu?: any;
  collapsedCols: Record<string, boolean>;
  collapseAttr: any;
  expandAttr: any;
  toggleColKey: any;
  clickHeaderHandler: any;
};

export const ColHeaderRow: FC<Props> = memo(
  ({
    attrName,
    attrIdx,
    pivotSettings,
    tableOptions,
    onContextMenu,
    collapsedCols,
    collapseAttr,
    expandAttr,
    toggleColKey,
    clickHeaderHandler,
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
    let i = 0;
    while (i < visibleColKeys.length) {
      let handleContextMenu;
      const colKey = visibleColKeys[i];
      const colSpan = attrIdx < colKey.length ? colAttrSpans[i][attrIdx] : 1;
      let colLabelClass = 'pvtColLabel';
      if (attrIdx < colKey.length) {
        if (!omittedHighlightHeaderGroups.includes(colAttrs[attrIdx])) {
          if (highlightHeaderCellsOnHover) colLabelClass += ' hoverable';
          handleContextMenu = (e: any) =>
            onContextMenu?.(e, colKey, undefined, {
              [attrName]: colKey[attrIdx],
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
            ? dateFormatters[attrName](colKey[attrIdx])
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
              colAttrs,
              attrIdx,
              tableOptions.clickColumnHeaderCallback,
            )}
            onContextMenu={handleContextMenu}
          >
            {displayHeaderCell(
              needToggle,
              collapsedCols[flatColKey] ? arrowCollapsed : arrowExpanded,
              onArrowClick,
              headerCellFormattedValue,
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
              colAttrs,
              attrIdx,
              tableOptions.clickColumnHeaderCallback,
              true,
            )}
          >
            {t('Subtotal')}
          </th>,
        );
      }
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
            colAttrs,
            attrIdx,
            tableOptions.clickColumnHeaderCallback,
            false,
            true,
          )}
        >
          {t('Total (%(aggregatorName)s)', {
            aggregatorName: t(tableOptions.aggregatorName),
          })}
        </th>
      ) : null;

    const cells = [spaceCell, attrNameCell, ...attrValueCells, totalCell];
    return <tr key={`colAttr-${attrIdx}`}>{cells}</tr>;
  },
);
ColHeaderRow.displayName = 'ColHeaderRow';
