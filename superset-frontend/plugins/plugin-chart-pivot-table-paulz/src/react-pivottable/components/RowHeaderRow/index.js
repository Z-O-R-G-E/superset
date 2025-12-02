import { t } from '@superset-ui/core';
import { displayHeaderCell } from '../../utils';

export const RowHeaderRow = ({
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
      {rowAttrs.map((r, i) => {
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
