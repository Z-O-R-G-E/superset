import { FC, memo, useMemo } from 'react';
import { t } from '@superset-ui/core';
import { flatKey } from '../utilities';

type Props = {
  pivotSettings: any;
  tableOptions: any;
  onContextMenu?: any;
};

export const TotalsRow: FC<Props> = memo(
  ({ pivotSettings, tableOptions, onContextMenu }) => {
    const {
      rowAttrs,
      colAttrs,
      visibleColKeys,
      rowTotals,
      pivotData,
      colTotalCallbacks,
      grandTotalCallback,
    } = pivotSettings;

    const aggregatorName: string = useMemo(
      () => tableOptions?.aggregatorName ?? 'aggregatorName',
      [tableOptions?.aggregatorName],
    );

    const totalLabelCell = (
      <th
        key="label"
        className="pvtTotalLabel pvtRowTotalLabel"
        colSpan={rowAttrs.length + Math.min(colAttrs.length, 1)}
        role="columnheader button"
        onClick={pivotSettings.clickHeaderHandler?.(
          pivotData,
          [],
          pivotSettings.rowAttrs,
          0,
          tableOptions.clickRowHeaderCallback,
          false,
          true,
        )}
      >
        {t('Total (%(aggregatorName)s)', {
          aggregatorName: t(aggregatorName),
        })}
      </th>
    );

    const totalValueCells = visibleColKeys.map((colKey: any[]) => {
      const flatColKey = flatKey(colKey);
      const agg = pivotData.getAggregator([], colKey);
      const aggValue = agg.value();

      return (
        <td
          role="gridcell"
          className="pvtTotal pvtRowTotal"
          key={`total-${flatColKey}`}
          onClick={colTotalCallbacks?.[flatColKey]}
          onContextMenu={e => onContextMenu?.(e, colKey, undefined)}
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
          onContextMenu={e => onContextMenu?.(e, undefined, undefined)}
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
  },
);
TotalsRow.displayName = 'TotalsRow';
