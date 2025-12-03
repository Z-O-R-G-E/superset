import {
  DataRecord,
  NumberFormatter,
  CurrencyFormatter,
  t,
} from '@superset-ui/core';
import { aggregatorsFactory, flatKey, getSort, naturalSort } from './utils';
import { aggregators } from './utils/aggregatorTemplates';

const VALS = ['value'];

type Order = 'key_a_to_z' | 'key_z_to_a' | 'value_a_to_z' | 'value_z_to_a';

interface PivotProps {
  data: DataRecord[];
  rows: string[];
  cols: string[];
  defaultFormatter: NumberFormatter | CurrencyFormatter;
  customFormatters?: {
    [p: string]: { [p: string]: NumberFormatter | CurrencyFormatter };
  };
  aggregatorName: string;
  colOrder: Order;
  rowOrder: Order;
  sorters: { [p: string]: (a: string | number, b: string | number) => number };
}

interface Subtotals {
  rowEnabled?: boolean;
  colEnabled?: boolean;
  rowPartialOnTop?: boolean;
  colPartialOnTop?: boolean;
}

interface Aggregator {
  push: (record: any) => void;
  value: () => any;
  format: (x?: any) => string;
  isSubtotal?: boolean;
  isRowSubtotal?: boolean;
  isColSubtotal?: boolean;
}

type AggregatorFactory = (
  vals: string[],
) => (acc: any, rowKey: any[], colKey: any[]) => Aggregator;

interface PivotData {
  getAggregator: (rowKey: any[], colKey: any[]) => Aggregator;
  getRowKeys: () => any[][];
  getColKeys: () => any[][];
}

const defaultProps: Partial<PivotProps> & {
  vals?: string[];
  aggregators?: Record<string, (...args: any[]) => any>;
} = {
  aggregators,
  cols: [],
  rows: [],
  vals: [],
  aggregatorName: 'Count',
  sorters: {},
  rowOrder: 'key_a_to_z',
  colOrder: 'key_a_to_z',
};

export const createPivotData = (
  inputProps: PivotProps,
  subtotals: Subtotals = {},
): PivotData => {
  const props: PivotProps = { ...defaultProps, ...inputProps };

  const aggregatorFactory: AggregatorFactory = aggregatorsFactory(
    props.defaultFormatter,
  )[props.aggregatorName!];
  const aggregator = aggregatorFactory(VALS);

  const formattedAggregators = props.customFormatters
    ? Object.fromEntries(
        Object.entries(props.customFormatters).map(([key, columnFormatter]) => [
          key,
          Object.fromEntries(
            Object.entries(columnFormatter).map(([column, formatter]) => [
              column,
              aggregatorsFactory(formatter)[props.aggregatorName!](VALS),
            ]),
          ),
        ]),
      )
    : null;

  const tree: Record<string, Record<string, Aggregator>> = {};
  const rowKeys: any[][] = [];
  const colKeys: any[][] = [];
  const rowTotals: Record<string, Aggregator> = {};
  const colTotals: Record<string, Aggregator> = {};
  const allTotal: Aggregator = aggregator({}, [], []);
  let sorted = false;

  const getAggregator = (rowKey: any[], colKey: any[]): Aggregator => {
    const flatRowKey = flatKey(rowKey);
    const flatColKey = flatKey(colKey);

    const agg =
      rowKey.length === 0 && colKey.length === 0
        ? allTotal
        : rowKey.length === 0
          ? colTotals[flatColKey]
          : colKey.length === 0
            ? rowTotals[flatRowKey]
            : tree[flatRowKey][flatColKey];

    return (
      agg || {
        push: () => {},
        value: () => null,
        format: () => '',
      }
    );
  };

  const getFormattedAggregator = (
    record: Record<string, any>,
    totalsKeys?: any[],
  ) => {
    if (!formattedAggregators) return aggregator;

    const [groupName, groupValue] =
      Object.entries(record).find(
        ([name, value]) => formattedAggregators[name]?.[value],
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
    const sortersArr = attrs.map(a => getSort(props.sorters!, a));
    return (a: any[], b: any[]) => {
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

    const v = (r: any[], c: any[]) => getAggregator(r, c).value();

    switch (props.rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(arrSort(props.rows!, subtotals.rowPartialOnTop, true));
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(props.rows!, subtotals.rowPartialOnTop));
    }

    switch (props.colOrder) {
      case 'key_z_to_a':
        colKeys.sort(arrSort(props.cols!, subtotals.colPartialOnTop, true));
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
        break;
      default:
        colKeys.sort(arrSort(props.cols!, subtotals.colPartialOnTop));
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

  const processRecord = (record: Record<string, any>) => {
    const colKey = props.cols!.map(col =>
      col in record ? record[col] : 'null',
    );
    const rowKey = props.rows!.map(row =>
      row in record ? record[row] : 'null',
    );

    allTotal.push(record);

    const rowStart = subtotals.rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = subtotals.colEnabled ? 1 : Math.max(1, colKey.length);

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);

      if (!rowTotals[flatRowKey]) {
        rowKeys.push(fRowKey);
        rowTotals[flatRowKey] = getFormattedAggregator(record, rowKey)(
          {},
          fRowKey,
          [],
        );
      }
      rowTotals[flatRowKey].push(record);
      rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isColSubtotal = ci < colKey.length;
      const fColKey = colKey.slice(0, ci);
      const flatColKey = flatKey(fColKey);

      if (!colTotals[flatColKey]) {
        colKeys.push(fColKey);
        colTotals[flatColKey] = getFormattedAggregator(record, colKey)(
          {},
          [],
          fColKey,
        );
      }
      colTotals[flatColKey].push(record);
      colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);
      if (!tree[flatRowKey]) tree[flatRowKey] = {};

      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        const isColSubtotal = ci < colKey.length;
        const fColKey = colKey.slice(0, ci);
        const flatColKey = flatKey(fColKey);

        if (!tree[flatRowKey][flatColKey]) {
          tree[flatRowKey][flatColKey] = getFormattedAggregator(record)(
            {},
            fRowKey,
            fColKey,
          );
        }
        tree[flatRowKey][flatColKey].push(record);
        tree[flatRowKey][flatColKey].isRowSubtotal = isRowSubtotal;
        tree[flatRowKey][flatColKey].isColSubtotal = isColSubtotal;
        tree[flatRowKey][flatColKey].isSubtotal =
          isRowSubtotal || isColSubtotal;
      }
    }
  };

  const inputData = Array.isArray(props.data)
    ? props.data
    : (() => {
        throw new Error(t('Unknown input format'));
      })();

  inputData.forEach(processRecord);

  return {
    getAggregator,
    getRowKeys,
    getColKeys,
  };
};
