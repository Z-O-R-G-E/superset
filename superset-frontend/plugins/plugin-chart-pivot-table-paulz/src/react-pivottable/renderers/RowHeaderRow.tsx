import { FC, memo } from 'react';
import { t } from '@superset-ui/core';
import { displayHeaderCell } from '../utils';

type Props = {
  pivotSettings: any;
  tableOptions: any;
  clickHeaderHandler: any;
  collapseAttr: any;
  expandAttr: any;
  toggleRowKey: any;
};

export const RowHeaderRow: FC<Props> = memo(
  ({
    pivotSettings,
    tableOptions,
    clickHeaderHandler,
    collapseAttr,
    expandAttr,
  }) => {
    const {
      rowAttrs,
      colAttrs,
      rowKeys,
      arrowCollapsed,
      arrowExpanded,
      rowSubtotalDisplay,
      maxRowVisible,
      pivotData,
      namesMapping,
    } = pivotSettings;

    return (
      <tr key="rowHdr">
        {rowAttrs.map((r: any, i: number) => {
          const needLabelToggle =
            rowSubtotalDisplay.enabled && i !== rowAttrs.length - 1;
          let arrowClickHandle = null;
          let subArrow: any = null;
          if (needLabelToggle) {
            arrowClickHandle =
              i + 1 < maxRowVisible
                ? collapseAttr(true, i, rowKeys)
                : expandAttr(true, i, rowKeys);
            subArrow = i + 1 < maxRowVisible ? arrowExpanded : arrowCollapsed;
          }
          return (
            <th className="pvtAxisLabel" key={`rowAttr-${i}`}>
              {displayHeaderCell(
                needLabelToggle,
                subArrow,
                arrowClickHandle,
                r,
                namesMapping,
              )}
            </th>
          );
        })}
        <th
          className="pvtTotalLabel"
          key="padding"
          role="columnheader button"
          onClick={clickHeaderHandler(
            pivotData,
            [],
            pivotSettings.rowAttrs,
            0,
            tableOptions.clickRowHeaderCallback,
            false,
            true,
          )}
        >
          {colAttrs.length === 0
            ? t('Total (%(aggregatorName)s)', {
                aggregatorName: t(tableOptions.aggregatorName),
              })
            : null}
        </th>
      </tr>
    );
  },
);
RowHeaderRow.displayName = 'RowHeaderRow';
