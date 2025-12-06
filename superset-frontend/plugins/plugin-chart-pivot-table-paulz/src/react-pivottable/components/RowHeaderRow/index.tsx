import { DataRecordValue, t } from '@superset-ui/core';
import { FC, MouseEvent } from 'react';
import { displayHeaderCell } from '../../utils';
import {
  ClickHeaderHandlerProps,
  ClickHeaderHandlerType,
} from '../../hooks/useClickHeaderHandler';
import { PivotSettingsType } from '../../hooks/usePivotSettings';

interface RowHeaderRowProps {
  pivotSettings: PivotSettingsType;
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
  clickHeaderHandler: ClickHeaderHandlerType;
  rows: string[];
  clickRowHeaderCallback: ClickHeaderHandlerProps['callback'];
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
      {rowAttrs.map((rowAttr, index) => {
        const needLabelToggle =
          rowSubtotalDisplay.enabled && index !== rowAttrs.length - 1;
        let arrowClickHandle = null;
        let subArrow = null;
        if (needLabelToggle) {
          arrowClickHandle =
            index + 1 < maxRowVisible
              ? collapseAttr(true, index, rowKeys)
              : expandAttr(true, index, rowKeys);
          subArrow = index + 1 < maxRowVisible ? arrowExpanded : arrowCollapsed;
        }
        return (
          <th className="pvtAxisLabel" key={`rowAttr-${index}`}>
            {displayHeaderCell(
              needLabelToggle,
              subArrow,
              arrowClickHandle,
              rowAttr,
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
