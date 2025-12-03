import { t } from '@superset-ui/core';
import { FC, MouseEvent } from 'react';
import { displayHeaderCell } from '../../utils';
import { FilterType } from '../../../types';

interface RowHeaderRowProps {
  pivotSettings: any;
  collapseAttr: (
    rowOrCol: any,
    attrIdx: any,
    allKeys: any,
  ) => (e: MouseEvent) => void;
  expandAttr: (
    rowOrCol: any,
    attrIdx: any,
    allKeys: any,
  ) => (e: MouseEvent) => void;
  clickHeaderHandler: (
    pivotData: any,
    values: any,
    attrs: any,
    attrIdx: any,
    callback: any,
    isSubtotal?: any,
    isGrandTotal?: any,
  ) => (e: MouseEvent) => any;
  rows: string[];
  clickRowHeaderCallback: (
    e: MouseEvent,
    value: string,
    filters: FilterType,
    pivotData: Record<string, any>,
    isSubtotal: boolean,
    isGrandTotal: boolean,
  ) => void;
  aggregatorName: string;
}

export const RowHeaderRow: FC<RowHeaderRowProps> = ({
  pivotSettings,
  collapseAttr,
  expandAttr,
  clickHeaderHandler,
  rows,
  clickRowHeaderCallback,
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
      {rowAttrs.map((r: any, i: any) => {
        const needLabelToggle =
          rowSubtotalDisplay.enabled && i !== rowAttrs.length - 1;
        let arrowClickHandle = null;
        let subArrow = null;
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
          rows,
          0,
          clickRowHeaderCallback,
          false,
          true,
        )}
      >
        {colAttrs.length === 0
          ? t('Total (%(aggregatorName)s)', {
              aggregatorName: t(aggregatorName),
            })
          : null}
      </th>
    </tr>
  );
};
