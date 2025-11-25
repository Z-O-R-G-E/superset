import { aggregators, flatKey, getSort, naturalSort } from './utilities';

export interface PivotDataProps {
  data: any[];
  aggregatorName?: string;
  aggregatorsFactory?: (
    formatter?: any,
  ) => Record<
    string,
    (vals?: string[]) => (data?: any, rowKey?: any[], colKey?: any[]) => any
  >;
  cols?: string[];
  rows?: string[];
  vals?: string[];
  sorters?: Record<string, Function> | Function;
  rowOrder?: 'key_a_to_z' | 'key_z_to_a' | 'value_a_to_z' | 'value_z_to_a';
  colOrder?: 'key_a_to_z' | 'key_z_to_a' | 'value_a_to_z' | 'value_z_to_a';
  defaultFormatter?: any;
  customFormatters?: Record<string, Record<string, any>>;
}

export interface Aggregator {
  push: (record: any) => void;
  value: () => any;
  format: (x: any) => any;
  isSubtotal?: boolean;
  isRowSubtotal?: boolean;
  isColSubtotal?: boolean;
  [k: string]: any;
}

export interface PivotDataResult {
  tree: Record<string, Record<string, Aggregator>>;
  rowKeys: any[][];
  colKeys: any[][];
  rowTotals: Record<string, Aggregator>;
  colTotals: Record<string, Aggregator>;
  allTotal: Aggregator;
  sortKeys: () => void;
  getAggregator: (rowKey: any[], colKey: any[]) => Aggregator;
}

const defaultProps: Partial<PivotDataProps> = {
  aggregatorsFactory: () => aggregators,
  cols: [],
  rows: [],
  vals: [],
  aggregatorName: 'Count',
  sorters: {},
  rowOrder: 'key_a_to_z',
  colOrder: 'key_a_to_z',
};

export function createPivotData(
  inputProps: PivotDataProps,
  subtotals: {
    rowEnabled?: boolean;
    colEnabled?: boolean;
    rowPartialOnTop?: boolean;
    colPartialOnTop?: boolean;
  } = {},
): PivotDataResult {
  const props: PivotDataProps = {
    ...(defaultProps as PivotDataProps),
    ...inputProps,
  };

  const aggregatorFactory = props.aggregatorsFactory!;
  const aggregatorGenerator = aggregatorFactory(props.defaultFormatter)[
    props.aggregatorName!
  ];
  const aggregator: Aggregator = aggregatorGenerator(props.vals || [])(
    undefined,
    [],
    [],
  );

  const formattedAggregators:
    | Record<string, Record<string, Aggregator>>
    | undefined = props.customFormatters
    ? Object.entries(props.customFormatters).reduce(
        (acc, [key, columnFormatter]) => {
          acc[key] = {};
          Object.entries(columnFormatter).forEach(([column, formatter]) => {
            acc[key][column] = aggregatorFactory(formatter)[
              props.aggregatorName!
            ](props.vals || [])(undefined, [], []);
          });
          return acc;
        },
        {} as Record<string, Record<string, Aggregator>>,
      )
    : undefined;

  const tree: Record<string, Record<string, Aggregator>> = {};
  const rowKeys: any[][] = [];
  const colKeys: any[][] = [];
  const rowTotals: Record<string, Aggregator> = {};
  const colTotals: Record<string, Aggregator> = {};
  const allTotal: Aggregator = aggregator;

  let sorted = false;

  const getFormattedAggregator = (
    record: Record<string, any>,
    totalsKeys?: any[],
  ) => {
    if (!formattedAggregators) {
      return aggregatorGenerator(props.vals || [])(undefined, [], []);
    }

    let matchedAggregator: Aggregator | null = null;

    for (const name of Object.keys(formattedAggregators)) {
      const group = formattedAggregators[name];

      const rawValue = record[name];
      if (rawValue === undefined) continue;

      const valueKey = String(rawValue);

      if (group.hasOwnProperty(valueKey)) {
        if (totalsKeys && !totalsKeys.includes(rawValue)) continue;
        matchedAggregator = group[valueKey];
        break;
      }
    }

    return (
      matchedAggregator ||
      aggregatorGenerator(props.vals || [])(undefined, [], [])
    );
  };

  const arrSort = (
    attrs: string[],
    partialOnTop?: boolean,
    reverse = false,
  ) => {
    const sortersArr = attrs.map(a => getSort(props.sorters, a));
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

  const processRecord = (record: any) => {
    const colKey: any[] = (props.cols || []).map(col =>
      col in record ? record[col] : 'null',
    );
    const rowKey: any[] = (props.rows || []).map(row =>
      row in record ? record[row] : 'null',
    );

    // добавляем запись во всеобщее агрегирование
    allTotal.push(record);

    const rowStart = subtotals.rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = subtotals.colEnabled ? 1 : Math.max(1, colKey.length);

    // --- rowTotals ---
    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);

      if (!rowTotals[flatRowKey]) {
        rowKeys.push(fRowKey);
        rowTotals[flatRowKey] = getFormattedAggregator(record, rowKey);
      }

      rowTotals[flatRowKey].push(record);
      rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    // --- colTotals ---
    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isColSubtotal = ci < colKey.length;
      const fColKey = colKey.slice(0, ci);
      const flatColKey = flatKey(fColKey);

      if (!colTotals[flatColKey]) {
        colKeys.push(fColKey);
        colTotals[flatColKey] = getFormattedAggregator(record, colKey);
      }

      colTotals[flatColKey].push(record);
      colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    // --- tree ---
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
          tree[flatRowKey][flatColKey] = getFormattedAggregator(record);
        }

        const agg = tree[flatRowKey][flatColKey];
        agg.push(record);
        agg.isRowSubtotal = isRowSubtotal;
        agg.isColSubtotal = isColSubtotal;
        agg.isSubtotal = isRowSubtotal || isColSubtotal;
      }
    }
  };

  if (!Array.isArray(props.data)) {
    throw new Error('Unsupported input type');
  }
  props.data.forEach(record => processRecord(record));

  const getAggregator = (rowKey: any[], colKey: any[]): Aggregator => {
    const flatRowKey = flatKey(rowKey || []);
    const flatColKey = flatKey(colKey || []);
    let agg: Aggregator | undefined;
    if ((rowKey || []).length === 0 && (colKey || []).length === 0)
      agg = allTotal;
    else if ((rowKey || []).length === 0) agg = colTotals[flatColKey];
    else if ((colKey || []).length === 0) agg = rowTotals[flatRowKey];
    else agg = tree[flatRowKey]?.[flatColKey];
    return agg || { value: () => null, format: () => '' };
  };

  const sortKeys = () => {
    if (sorted) return;
    sorted = true;

    const v = (r: any[], c: any[]) => getAggregator(r, c).value();

    // rows
    switch (props.rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(
          arrSort(props.rows || [], subtotals.rowPartialOnTop, true),
        );
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(props.rows || [], subtotals.rowPartialOnTop));
    }

    // columns
    switch (props.colOrder) {
      case 'key_z_to_a':
        colKeys.sort(
          arrSort(props.cols || [], subtotals.colPartialOnTop, true),
        );
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
        break;
      default:
        colKeys.sort(arrSort(props.cols || [], subtotals.colPartialOnTop));
    }
  };

  return {
    tree,
    rowKeys,
    colKeys,
    rowTotals,
    colTotals,
    allTotal,
    sortKeys,
    getAggregator,
  };
}

export default createPivotData;
