import { t } from '@superset-ui/core';
import { flatKey, getSort, naturalSort } from './utils';
import { FormattersType } from '../hooks/useFormatters';
import { UnpivotedDataType } from '../hooks/usePivotData';
import { aggregatorsFactory } from './utils/aggregatorTemplates';

const VALS = ['value'];

interface PivotProps {
  unpivotedData: UnpivotedDataType;
  formatters: FormattersType;
  aggregatorName: string;
  colOrder: string;
  rowOrder: string;
}

interface Subtotals {
  rowEnabled?: boolean;
  colEnabled?: boolean;
  rowPartialOnTop?: boolean;
  colPartialOnTop?: boolean;
}

export type PivotDataType = ReturnType<typeof createPivotData>;

export const createPivotData = (
  {
    unpivotedData,
    formatters,
    aggregatorName = 'Count',
    colOrder = 'key_a_to_z',
    rowOrder = 'key_a_to_z',
  }: PivotProps,
  subtotals: Subtotals,
) => {
  const { data, rows = [], cols = [], sorters = {} } = unpivotedData;
  const { defaultFormatter, metricFormatters } = formatters;
  const { rowEnabled, colEnabled, rowPartialOnTop, colPartialOnTop } =
    subtotals;

  const aggregator =
    aggregatorsFactory(defaultFormatter)[aggregatorName!]?.(VALS);

  const formattedAggregators:
    | Record<string, Record<string, string | number>>
    | undefined =
    metricFormatters &&
    Object.entries(metricFormatters).reduce((acc, [key, columnFormatter]) => {
      acc[key] = {};
      Object.entries(columnFormatter).forEach(([column, formatter]) => {
        acc[key][column] = aggregatorsFactory(formatter)[aggregatorName](VALS);
      });
      return acc;
    }, {});

  const tree = {};
  const rowKeys: (string | number)[][] = [];
  const colKeys: (string | number)[][] = [];
  const rowTotals = {};
  const colTotals = {};
  const allTotal = aggregator({}, [], []);
  let sorted = false;

  const getAggregator = (
    rowKey: (string | number)[],
    colKey: (string | number)[],
  ) => {
    let agg;
    const flatRowKey = flatKey(rowKey);
    const flatColKey = flatKey(colKey);
    if (rowKey.length === 0 && colKey.length === 0) {
      agg = allTotal;
    } else if (rowKey.length === 0) {
      agg = colTotals[flatColKey];
    } else if (colKey.length === 0) {
      agg = rowTotals[flatRowKey];
    } else {
      agg = tree[flatRowKey][flatColKey];
    }
    return (
      agg || {
        value() {
          return null;
        },
        format() {
          return '';
        },
      }
    );
  };

  const getFormattedAggregator = (
    record: Record<string, number | string>,
    totalsKeys?: (string | number)[],
  ) => {
    if (!formattedAggregators) {
      return aggregator;
    }
    const [groupName, groupValue] =
      Object.entries(record).find(
        ([name, value]) =>
          formattedAggregators?.[name] && formattedAggregators[name][value],
      ) || [];
    if (
      !groupName ||
      !groupValue ||
      (totalsKeys && !totalsKeys.includes(groupValue))
    ) {
      return aggregator;
    }
    return formattedAggregators[groupName][groupValue] || aggregator;
  };

  const arrSort = (
    attrs: string[],
    partialOnTop?: boolean,
    reverse = false,
  ) => {
    const sortersArr = attrs.map(a => getSort(sorters, a));
    return (a: number[], b: number[]) => {
      const limit = Math.min(a.length, b.length);
      for (let i = 0; i < limit; i += 1) {
        const sorter = sortersArr[i];
        const comparison = reverse ? sorter(b[i], a[i]) : sorter(a[i], b[i]);
        if (comparison !== 0) return comparison;
      }
      return partialOnTop ? a.length - b.length : b.length - a.length;
    };
  };

  const sortKeys = () => {
    if (sorted) return;
    sorted = true;

    const v = (r: (string | number)[], c: (string | number)[]) =>
      getAggregator(r, c).value();

    switch (rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(arrSort(rows!, rowPartialOnTop, true));
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(rows!, rowPartialOnTop));
    }

    switch (colOrder) {
      case 'key_z_to_a':
        colKeys.sort(arrSort(cols!, colPartialOnTop, true));
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
        break;
      default:
        colKeys.sort(arrSort(cols!, colPartialOnTop));
    }
  };

  const getRowKeys = () => {
    sortKeys();
    return rowKeys;
  };

  const getColKeys = () => {
    sortKeys();
    return colKeys;
  };

  const processRecord = (record: Record<string, number | string>) => {
    const colKey = cols!.map(col => record[col] ?? 'null');
    const rowKey = rows!.map(row => record[row] ?? 'null');

    allTotal.push(record);

    const rowStart = rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = colEnabled ? 1 : Math.max(1, colKey.length);

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isSubtotal = ri < rowKey.length;
      const rk = rowKey.slice(0, ri);
      const fr = flatKey(rk);

      if (!rowTotals[fr]) {
        rowKeys.push(rk);
        rowTotals[fr] = getFormattedAggregator(record, rowKey)(
          {
            rowTotals,
            colTotals,
            tree,
            allTotal,
            getAggregator,
          },
          rk,
          [],
        );
      }

      rowTotals[fr].push(record);
      rowTotals[fr].isSubtotal = isSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isSubtotal = ci < colKey.length;
      const ck = colKey.slice(0, ci);
      const fc = flatKey(ck);

      if (!colTotals[fc]) {
        colKeys.push(ck);
        colTotals[fc] = getFormattedAggregator(record, colKey)(
          {
            rowTotals,
            colTotals,
            tree,
            allTotal,
            getAggregator,
          },
          [],
          ck,
        );
      }

      colTotals[fc].push(record);
      colTotals[fc].isSubtotal = isSubtotal;
    }

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const rk = rowKey.slice(0, ri);
      const fr = flatKey(rk);

      if (!tree[fr]) tree[fr] = {};

      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        const isColSubtotal = ci < colKey.length;
        const ck = colKey.slice(0, ci);
        const fc = flatKey(ck);

        if (!tree[fr][fc]) {
          tree[fr][fc] = getFormattedAggregator(record)(
            {
              rowTotals,
              colTotals,
              tree,
              allTotal,
              getAggregator,
            },
            rk,
            ck,
          );
        }

        const cell = tree[fr][fc];
        cell.push(record);
        if (!cell.initialized) {
          cell.isSubtotal = isRowSubtotal || isColSubtotal;
          cell.isRowSubtotal = isRowSubtotal;
          cell.isColSubtotal = isColSubtotal;
          cell.initialized = true;
        }
      }
    }
  };

  if (!Array.isArray(data)) {
    throw new Error(t('Unknown input format'));
  }

  data.forEach(processRecord);

  return {
    getAggregator,
    getRowKeys,
    getColKeys,
  };
};
