import { t } from '@superset-ui/core';
import { flatKey } from '../../utils';

export const TotalsRow = ({
  pivotSettings,
  clickHeaderHandler,
  rows,
  clickRowHeaderCallback,
  aggregatorName,
  onContextMenu,
}) => {
  const {
    rowAttrs,
    colAttrs,
    visibleColKeys,
    rowTotals,
    pivotData,
    colTotalCallbacks,
    grandTotalCallback,
  } = pivotSettings;

  const totalLabelCell = (
    <th
      key="label"
      className="pvtTotalLabel pvtRowTotalLabel"
      colSpan={rowAttrs.length + Math.min(colAttrs.length, 1)}
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
      {t('Total (%(aggregatorName)s)', {
        aggregatorName: t(aggregatorName),
      })}
    </th>
  );

  const totalValueCells = visibleColKeys.map(colKey => {
    const flatColKey = flatKey(colKey);
    const agg = pivotData.getAggregator([], colKey);
    const aggValue = agg.value();

    return (
      <td
        role="gridcell"
        className="pvtTotal pvtRowTotal"
        key={`total-${flatColKey}`}
        onClick={colTotalCallbacks[flatColKey]}
        onContextMenu={e => onContextMenu(e, colKey, undefined)}
        style={{ padding: '5px' }}
      >
        {agg.format(aggValue)}
      </td>
    );
  });

  let grandTotalCell = null;
  if (rowTotals) {
    const agg = pivotData.getAggregator([], []);
    const aggValue = agg.value();
    grandTotalCell = (
      <td
        role="gridcell"
        key="total"
        className="pvtGrandTotal pvtRowTotal"
        onClick={grandTotalCallback}
        onContextMenu={e => onContextMenu(e, undefined, undefined)}
      >
        {agg.format(aggValue)}
      </td>
    );
  }

  const totalCells = [totalLabelCell, ...totalValueCells, grandTotalCell];

  return (
    <tr key="total" className="pvtRowTotals">
      {totalCells}
    </tr>
  );
};
