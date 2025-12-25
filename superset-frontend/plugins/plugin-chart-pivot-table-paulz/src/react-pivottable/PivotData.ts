import { DataRecordValue, t } from '@superset-ui/core';
import { flatKey, getSort, naturalSort } from './utils';
import { FormattersType } from '../hooks/useFormatters';
import { UnpivotedDataType } from '../hooks/usePivotData';
import {
  aggregatorsFactory,
  ratioPercentFormatter,
} from './utils/aggregatorTemplates';

interface PivotProps {
  unpivotedData: UnpivotedDataType;
  formatters: FormattersType;
  aggregatorName: string;
  colOrder: string;
  rowOrder: string;
  ratios?: {
    ratio: string;
    numerator: string;
    denominator: string;
  }[];
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
    aggregatorName = 'Sum',
    colOrder = 'key_a_to_z',
    rowOrder = 'key_a_to_z',
    ratios = [],
  }: PivotProps,
  subtotals: Subtotals,
) => {
  const { data, rows = [], cols = [], sorters = {} } = unpivotedData;
  const { defaultFormatter, metricFormatters } = formatters;
  const { rowEnabled, colEnabled, rowPartialOnTop, colPartialOnTop } =
    subtotals;

  const ratioByLabel: Record<string, ParsedRatios> = Object.fromEntries(
    ratios.map(ratio => [ratio.ratio, ratio]),
  );

  const getRatioByColKey = (colKey?: DataRecordValue[]) => {
    if (!colKey || colKey.length === 0) return null;
    const ratioLabel = colKey[0] as string;
    return ratioByLabel[ratioLabel] || null;
  };

  const createRatioAggregatorFactory = (ratio: ParsedRatios) =>
    aggregatorsFactory(ratioPercentFormatter)['Sum over Sum']([
      ratio.numerator,
      ratio.denominator,
    ]);

  const baseAggregator = aggregatorsFactory(defaultFormatter)[aggregatorName]?.(
    ['value'],
  );

  const formattedAggregators =
    metricFormatters &&
    Object.entries(metricFormatters).reduce((acc, [key, columnFormatter]) => {
      acc[key] = {};
      Object.entries(columnFormatter).forEach(([column, formatter]) => {
        acc[key][column] = aggregatorsFactory(formatter)[aggregatorName]([
          'value',
        ]);
      });
      return acc;
    }, {});

  const tree = {};
  const rowKeys: (string | number | boolean)[][] = [];
  const colKeys: (string | number | boolean)[][] = [];
  const rowTotals = {};
  const colTotals = {};
  const allTotal = baseAggregator({}, [], []);
  let sorted = false;

  const pivotObj = {
    data,
    rows,
    cols,
    sorters,
    tree,
    rowTotals,
    colTotals,
    allTotal,
    getAggregator: (rowKey: DataRecordValue[], colKey: DataRecordValue[]) => {
      const flatRowKey = flatKey(rowKey);
      const flatColKey = flatKey(colKey);

      let agg;
      if (rowKey.length === 0 && colKey.length === 0) {
        agg = pivotObj.allTotal;
      } else if (rowKey.length === 0) {
        agg = colTotals[flatColKey];
      } else if (colKey.length === 0) {
        agg = rowTotals[flatRowKey];
      } else {
        agg = tree[flatRowKey]?.[flatColKey];
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
    },
  };

  pivotObj.allTotal = baseAggregator(pivotObj, [], []);

  const getFormattedAggregator = (
    record: Record<string, number | string>,
    totalsKeys?: DataRecordValue[],
  ) => {
    if (!formattedAggregators) return baseAggregator;
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
      return baseAggregator;
    }
    return formattedAggregators[groupName][groupValue] || baseAggregator;
  };

  const resolveAggregatorFactory = (
    record: Record<string, number | string>,
    colKey?: DataRecordValue[],
  ) => {
    const ratio = getRatioByColKey(colKey);
    if (aggregatorName === 'Sum' && ratio) {
      return createRatioAggregatorFactory(ratio);
    }
    return getFormattedAggregator(record, colKey);
  };

  const arrSort = (
    attrs: string[],
    partialOnTop?: boolean,
    reverse = false,
  ) => {
    const sortersArr = attrs.map(attr => getSort(sorters, attr));
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

    const value = (rowKey: DataRecordValue[], colKey: DataRecordValue[]) =>
      pivotObj.getAggregator(rowKey, colKey).value();

    switch (rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(arrSort(rows, rowPartialOnTop, true));
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(value(a, []), value(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(value(a, []), value(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(rows, rowPartialOnTop));
    }

    switch (colOrder) {
      case 'key_z_to_a':
        colKeys.sort(arrSort(cols, colPartialOnTop, true));
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(value([], a), value([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(value([], a), value([], b)));
        break;
      default:
        colKeys.sort(arrSort(cols, colPartialOnTop));
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
    const rowKey = rows.map(row => record[row] ?? 'null');
    const colKey = cols.map(col => record[col] ?? 'null');

    const ratio = getRatioByColKey(colKey);
    const isRatioCol = Boolean(ratio);

    if (!isRatioCol) {
      pivotObj.allTotal.push(record);
    }

    const rowStart = rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = colEnabled ? 1 : Math.max(1, colKey.length);

    for (let rowIndex = rowStart; rowIndex <= rowKey.length; rowIndex += 1) {
      const isRowSubtotal = rowIndex < rowKey.length;
      const slicedRowKey = rowKey.slice(0, rowIndex);
      const flatRowKey = flatKey(slicedRowKey);

      if (!rowTotals[flatRowKey]) {
        rowKeys.push(slicedRowKey);
        rowTotals[flatRowKey] = getFormattedAggregator(record, rowKey)(
          pivotObj,
          slicedRowKey,
          [],
        );
      }

      if (!isRatioCol) {
        rowTotals[flatRowKey].push(record);
      }
      rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    for (let colIndex = colStart; colIndex <= colKey.length; colIndex += 1) {
      const isColSubtotal = colIndex < colKey.length;
      const slicedColKey = colKey.slice(0, colIndex);
      const flatColKey = flatKey(slicedColKey);

      if (!colTotals[flatColKey]) {
        colKeys.push(slicedColKey);
        colTotals[flatColKey] = resolveAggregatorFactory(record, slicedColKey)(
          pivotObj,
          [],
          slicedColKey,
        );
      }

      colTotals[flatColKey].push(record);
      colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    for (let rowIndex = rowStart; rowIndex <= rowKey.length; rowIndex += 1) {
      const isRowSubtotal = rowIndex < rowKey.length;
      const slicedRowKey = rowKey.slice(0, rowIndex);
      const flatRowKey = flatKey(slicedRowKey);

      if (!tree[flatRowKey]) tree[flatRowKey] = {};

      for (let colIndex = colStart; colIndex <= colKey.length; colIndex += 1) {
        const isColSubtotal = colIndex < colKey.length;
        const slicedColKey = colKey.slice(0, colIndex);
        const flatColKey = flatKey(slicedColKey);

        if (!tree[flatRowKey][flatColKey]) {
          tree[flatRowKey][flatColKey] = resolveAggregatorFactory(
            record,
            slicedColKey,
          )(pivotObj, slicedRowKey, slicedColKey);
        }

        const cell = tree[flatRowKey][flatColKey];
        cell.push(record);
        cell.isSubtotal = isRowSubtotal || isColSubtotal;
        cell.isRowSubtotal = isRowSubtotal;
        cell.isColSubtotal = isColSubtotal;
      }
    }
  };

  if (!Array.isArray(data)) {
    throw new Error(t('Unknown input format'));
  }

  data.forEach(processRecord);

  return {
    getAggregator: pivotObj.getAggregator,
    getRowKeys,
    getColKeys,
  };
};
