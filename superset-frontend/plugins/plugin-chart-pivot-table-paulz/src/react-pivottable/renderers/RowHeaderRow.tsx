import { FC, memo, MouseEvent } from 'react';
import { t } from '@superset-ui/core';
import { clickHeaderHandler, displayHeaderCell } from '../utils';
import { ComputedPivotSettingsType } from '../hooks/useComputedPivotSettings';
import { TableOptionsType } from '../../hooks/useTableOptions';

type RowHeaderRowProps = {
  pivotSettings: ComputedPivotSettingsType;
  tableOptions: TableOptionsType;
  collapseAttr: (
    rowOrCol: boolean,
    attrIdx: number,
    allKeys: any[],
  ) => (e?: MouseEvent | undefined) => void;
  expandAttr: (
    rowOrCol: boolean,
    attrIdx: number,
    allKeys: any[],
  ) => (e?: MouseEvent | undefined) => void;
  toggleRowKey: (flatRowKey: string) => (e?: MouseEvent | undefined) => void;
  aggregatorName: string;
};

export const RowHeaderRow: FC<RowHeaderRowProps> = memo(
  ({
    pivotSettings,
    tableOptions,
    collapseAttr,
    expandAttr,
    aggregatorName,
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
          onClick={() =>
            clickHeaderHandler(
              pivotData,
              [],
              pivotSettings.rowAttrs,
              0,
              tableOptions.clickRowHeaderCallback,
              false,
              true,
            )
          }
        >
          {colAttrs.length === 0
            ? t('Total (%(aggregatorName)s)', {
                aggregatorName: t(aggregatorName),
              })
            : null}
        </th>
      </tr>
    );
  },
);
RowHeaderRow.displayName = 'RowHeaderRow';
