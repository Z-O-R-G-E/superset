import { FC, memo, MouseEvent } from 'react';
import { t } from '@superset-ui/core';
import { flatKey } from '../utilities';
import { ComputedPivotSettingsType } from '../hooks/useComputedPivotSettings';
import { TableOptionsType } from '../../hooks/useTableOptions';
import { clickHeaderHandler } from '../utils';

type TotalsRowProps = {
  pivotSettings: ComputedPivotSettingsType;
  tableOptions: TableOptionsType;
  onContextMenu: (
    e: MouseEvent,
    colKey?: (string | number | boolean)[],
    rowKey?: (string | number | boolean)[],
    dataPoint?: { [p: string]: string },
  ) => void;
  aggregatorName: string;
};

export const TotalsRow: FC<TotalsRowProps> = memo(
  ({ pivotSettings, tableOptions, onContextMenu, aggregatorName }) => {
    const {
      rowAttrs,
      colAttrs,
      visibleColKeys,
      rowTotals,
      pivotData,
      colTotalCallbacks,
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
          onContextMenu={e => onContextMenu?.(e, colKey)}
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
          onContextMenu={e => onContextMenu?.(e)}
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
