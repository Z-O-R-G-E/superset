import { CurrencyFormatter, NumberFormatter } from '@superset-ui/core';
import { numberFormat } from '../numberFormat';
import { getSort, SortersInput } from '../getSort';

export type Formatter = (x: number) => string;

const usFmt = numberFormat({});
const usFmtInt = numberFormat({ digitsAfterDecimal: 0 });
const usFmtPct = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
});

const fmtNonString = (formatter: Formatter) => (x: number | string) =>
  typeof x === 'string' ? x : formatter(x);

const baseAggregatorTemplates = {
  count:
    (formatter: Formatter = usFmtInt) =>
    () =>
    () => {
      let count = 0;

      return {
        push() {
          count += 1;
        },
        value() {
          return count;
        },
        format: formatter,
      };
    },

  uniques:
    (
      fn: (arr: (string | number)[]) => string | number,
      formatter: Formatter = usFmtInt,
    ) =>
    ([attr]: string[]) =>
    () => {
      const uniq: (string | number)[] = [];

      return {
        push(record: string | number) {
          if (!uniq.includes(record?.[attr])) uniq.push(record?.[attr]);
        },
        value() {
          return fn(uniq);
        },
        format: fmtNonString(formatter),
        numInputs: attr !== undefined ? 0 : 1,
      };
    },

  sum:
    (formatter: Formatter = usFmt) =>
    ([attr]: string[]) =>
    () => {
      let sum = 0;

      return {
        push(record: string | number) {
          const numValue = Number(record?.[attr]);
          if (Number.isNaN(numValue)) sum = record?.[attr];
          else sum += parseFloat(record?.[attr]);
        },
        value() {
          return sum;
        },
        format: fmtNonString(formatter),
        numInputs: attr !== undefined ? 0 : 1,
      };
    },

  extremes:
    (mode: 'min' | 'max' | 'first' | 'last', formatter: Formatter = usFmt) =>
    ([attr]: string[]) =>
    (sorters: SortersInput) => {
      let val: string | number | null = null;
      const sorter = getSort(sorters ?? null, attr);
      return {
        push(record: string | number) {
          const x = record?.[attr];

          if (['min', 'max'].includes(mode)) {
            const coercedValue = Number(x);
            if (Number.isNaN(coercedValue)) {
              val =
                !val ||
                (mode === 'min' && x < val) ||
                (mode === 'max' && x > val)
                  ? x
                  : val;
            } else {
              val = Math[mode](coercedValue, val !== null ? val : coercedValue);
            }
          } else if (
            mode === 'first' &&
            sorter(x, val !== null ? val : x) <= 0
          ) {
            val = x;
          } else if (
            mode === 'last' &&
            sorter(x, val !== null ? val : x) >= 0
          ) {
            val = x;
          }
        },
        value() {
          return val;
        },
        format(x: number) {
          return formatter(x);
        },
        numInputs: attr !== undefined ? 0 : 1,
      };
    },

  quantile:
    (q: number, formatter: Formatter = usFmt) =>
    ([attr]: string[]) =>
    () => {
      const vals: number[] = [];
      const strMap = {};

      return {
        push(record: string | number) {
          const val = record?.[attr];
          const x = Number(val);

          if (Number.isNaN(x)) {
            strMap[val] = (strMap[val] || 0) + 1;
          } else {
            vals.push(x);
          }
        },
        value() {
          if (vals.length === 0 && Object.keys(strMap).length === 0) {
            return null;
          }

          if (Object.keys(strMap).length) {
            const values = Object.values(strMap).sort(
              (a: number, b: number) => a - b,
            );
            const middle = Math.floor(values.length / 2);
            const keys = Object.keys(strMap);

            return keys.length % 2 !== 0
              ? keys[middle]
              : (Number(keys[middle - 1]) + Number(keys[middle])) / 2;
          }

          vals.sort((a, b) => a - b);
          const i = (vals.length - 1) * q;
          return (vals[Math.floor(i)] + vals[Math.ceil(i)]) / 2.0;
        },
        format: fmtNonString(formatter),
        numInputs: attr !== undefined ? 0 : 1,
      };
    },

  runningStat:
    (mode: 'mean' | 'var' | 'stdev', ddof = 1, formatter: Formatter = usFmt) =>
    ([attr]: string[]) =>
    () => {
      let n = 0.0;
      let m = 0.0;
      let s = 0.0;
      let strValue: number | string | null = null;
      return {
        push(record: string | number) {
          const x = Number(record?.[attr]);
          if (Number.isNaN(x)) {
            strValue =
              typeof record?.[attr] === 'string' ? record[attr] : strValue;
            return;
          }
          n += 1.0;
          if (n === 1.0) m = x;
          const mNew = m + (x - m) / n;
          s += (x - m) * (x - mNew);
          m = mNew;
        },
        value() {
          if (strValue) return strValue;
          if (mode === 'mean') return n === 0 ? NaN : m;
          if (n <= ddof) return 0;
          switch (mode) {
            case 'var':
              return s / (n - ddof);
            case 'stdev':
              return Math.sqrt(s / (n - ddof));
            default:
              throw new Error('unknown mode for runningStat');
          }
        },
        format: fmtNonString(formatter),
        numInputs: attr !== undefined ? 0 : 1,
      };
    },

  sumOverSum:
    (formatter: Formatter = usFmt) =>
    ([num, denom]: string[]) =>
    () => {
      let sumNum = 0;
      let sumDenom = 0;
      return {
        push(record: string | number) {
          const numVal = record?.[num];
          const denomVal = record?.[denom];
          if (!Number.isNaN(Number(numVal))) sumNum += parseFloat(numVal);
          if (!Number.isNaN(Number(denomVal))) sumDenom += parseFloat(denomVal);
        },
        value() {
          return sumNum / sumDenom;
        },
        format: formatter,
        numInputs: num !== undefined && denom !== undefined ? 0 : 2,
      };
    },

  fractionOf:
    (
      wrapped: any,
      type: 'total' | 'row' | 'col' = 'total',
      formatter: Formatter = usFmtPct,
    ) =>
    ([attr]: string[]) =>
    (pivotData?: any, rowKey?: any[], colKey?: any[]) => {
      if (!pivotData) {
        throw new Error('pivotData is required for fractionOf aggregator');
      }

      const selectorMap: Record<'total' | 'row' | 'col', [any[], any[]]> = {
        total: [[], []],
        row: [rowKey ?? [], []],
        col: [[], colKey ?? []],
      };

      const selector = selectorMap[type];
      const inner = wrapped([attr])(pivotData, rowKey, colKey);

      return {
        selector,
        inner,
        push(record: string | number) {
          inner.push(record);
        },
        format: fmtNonString(formatter),
        value() {
          const aggregator = pivotData.getAggregator(...selector);
          if (!aggregator?.inner) {
            throw new Error('Inner aggregator not found');
          }

          const acc = aggregator.inner.value();
          const innerValue = inner.value() as number;

          if (typeof acc === 'string') return acc;
          return innerValue / acc;
        },
        numInputs: inner.numInputs,
      };
    },
};

const extendedAggregatorTemplates = {
  countUnique: (formatter: Formatter) =>
    baseAggregatorTemplates.uniques(x => x.length, formatter),
  listUnique: (separator: string, formatter: Formatter) =>
    baseAggregatorTemplates.uniques(x => x.join(separator), formatter) ||
    (x => x),
  max: (formatter: Formatter) =>
    baseAggregatorTemplates.extremes('max', formatter),
  min: (formatter: Formatter) =>
    baseAggregatorTemplates.extremes('min', formatter),
  first: (formatter: Formatter) =>
    baseAggregatorTemplates.extremes('first', formatter),
  last: (formatter: Formatter) =>
    baseAggregatorTemplates.extremes('last', formatter),
  median: (formatter: Formatter) =>
    baseAggregatorTemplates.quantile(0.5, formatter),
  average: (formatter: Formatter) =>
    baseAggregatorTemplates.runningStat('mean', 1, formatter),
  var: (ddof: number, formatter: Formatter) =>
    baseAggregatorTemplates.runningStat('var', ddof, formatter),
  stdev: (ddof: number, formatter: Formatter = usFmt) =>
    baseAggregatorTemplates.runningStat('stdev', ddof, formatter),
};

const aggregatorTemplates = {
  ...baseAggregatorTemplates,
  ...extendedAggregatorTemplates,
};

export const aggregatorsFactory = (
  formatter: NumberFormatter | CurrencyFormatter,
) => ({
  Count: aggregatorTemplates.count(formatter),
  'Count Unique Values': aggregatorTemplates.countUnique(formatter),
  'List Unique Values': aggregatorTemplates.listUnique(', ', formatter),
  Sum: aggregatorTemplates.sum(formatter),
  Average: aggregatorTemplates.average(formatter),
  Median: aggregatorTemplates.median(formatter),
  'Sample Variance': aggregatorTemplates.var(1, formatter),
  'Sample Standard Deviation': aggregatorTemplates.stdev(1, formatter),
  Minimum: aggregatorTemplates.min(formatter),
  Maximum: aggregatorTemplates.max(formatter),
  First: aggregatorTemplates.first(formatter),
  Last: aggregatorTemplates.last(formatter),
  'Sum over Sum': aggregatorTemplates.sumOverSum(formatter),
  'Sum as Fraction of Total': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'total',
    formatter,
  ),
  'Sum as Fraction of Rows': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'row',
    formatter,
  ),
  'Sum as Fraction of Columns': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'col',
    formatter,
  ),
  'Count as Fraction of Total': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'total',
    formatter,
  ),
  'Count as Fraction of Rows': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'row',
    formatter,
  ),
  'Count as Fraction of Columns': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'col',
    formatter,
  ),
});

export { aggregatorTemplates };
