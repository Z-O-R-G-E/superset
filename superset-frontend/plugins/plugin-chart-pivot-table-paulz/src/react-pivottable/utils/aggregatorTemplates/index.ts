import {
  CurrencyFormatter,
  DataRecordValue,
  NumberFormatter,
} from '@superset-ui/core';
import { numberFormat } from '../numberFormat';
import { getSort } from '../getSort';
import { UnpivotedDataType } from '../../../hooks/usePivotData';

type RecordType = number | string;

interface Aggregator {
  push: (record: RecordType) => void;
  value: () => string | number | null;
  format: (x: number) => string;
  numInputs?: number;
}

type SelectorType =
  | [DataRecordValue[], DataRecordValue[]]
  | [DataRecordValue, DataRecordValue[]]
  | [DataRecordValue[], DataRecordValue];

interface FractionAggregator extends Aggregator {
  selector: SelectorType;
  inner: Aggregator;
}

const usFmt = numberFormat({});
const usFmtInt = numberFormat({ digitsAfterDecimal: 0 });
const usFmtPct = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
});

const fmtNonString =
  (formatter: (x: number) => string): ((x: string | number) => string) =>
  (x: string | number): string =>
    typeof x === 'string' ? x : formatter(x);

const baseAggregatorTemplates = {
  count:
    (formatter = usFmtInt) =>
    (): (() => Aggregator) =>
    (): Aggregator => {
      let count = 0;

      return {
        push(): void {
          count += 1;
        },
        value(): number {
          return count;
        },
        format: formatter,
      };
    },

  uniques:
    (fn: (arr: RecordType[]) => RecordType, formatter = usFmtInt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      const uniq: RecordType[] = [];

      return {
        push(record): void {
          if (!uniq.includes(record[attr])) {
            uniq.push(record[attr]);
          }
        },
        value() {
          return fn(uniq);
        },
        format: fmtNonString(formatter),
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  sum:
    (formatter = usFmt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      let sum = 0;
      let stringValue: number | string | null = null;

      return {
        push(record): void {
          const numValue = Number(record[attr]);
          if (Number.isNaN(numValue)) {
            stringValue = record[attr];
          } else {
            sum += parseFloat(record[attr]);
          }
        },
        value() {
          return stringValue !== null ? stringValue : sum;
        },
        format: fmtNonString(formatter),
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  extremes:
    (mode: 'min' | 'max' | 'first' | 'last', formatter = usFmt) =>
    ([attr]: [string]): ((data?: UnpivotedDataType) => Aggregator) =>
    (data?: UnpivotedDataType): Aggregator => {
      let val: number | null = null;
      const sorter = getSort(data?.sorters ?? null, attr);

      return {
        push(record): void {
          const x: number = record[attr];

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
        format(x): string {
          return formatter(x);
        },
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  quantile:
    (q: number, formatter = usFmt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      const vals: number[] = [];
      const strMap: { [key: string]: number } = {};

      return {
        push(record: RecordType): void {
          const val = record[attr];
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
            const values = Object.values(strMap).sort((a, b) => a - b);
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
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  runningStat:
    (mode: 'mean' | 'var' | 'stdev' = 'mean', ddof = 1, formatter = usFmt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      let n = 0.0;
      let m = 0.0;
      let s = 0.0;
      let strValue: string | null = null;

      return {
        push(record: RecordType): void {
          const x = Number(record[attr]);
          if (Number.isNaN(x)) {
            strValue =
              typeof record[attr] === 'string' ? record[attr] : strValue;
            return;
          }

          n += 1.0;
          if (n === 1.0) {
            m = x;
          }
          const mNew = m + (x - m) / n;
          s += (x - m) * (x - mNew);
          m = mNew;
        },
        value() {
          if (strValue) {
            return strValue;
          }

          if (mode === 'mean') {
            return n === 0 ? NaN : m;
          }

          if (n <= ddof) {
            return 0;
          }

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
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  sumOverSum:
    (formatter = usFmt) =>
    ([num, denom]: [string, string]): (() => Aggregator) =>
    (): Aggregator => {
      let sumNum = 0;
      let sumDenom = 0;

      return {
        push(record): void {
          const numVal = record[num];
          const denomVal = record[denom];

          if (!Number.isNaN(Number(numVal))) {
            sumNum += parseFloat(numVal);
          }
          if (!Number.isNaN(Number(denomVal))) {
            sumDenom += parseFloat(denomVal);
          }
        },
        value(): number {
          return sumNum / sumDenom;
        },
        format: formatter,
        numInputs:
          typeof num !== 'undefined' && typeof denom !== 'undefined' ? 0 : 2,
      };
    },

  fractionOf:
    (wrapped: any, type: string, formatter = usFmtPct) =>
    (...x: RecordType[]): ((...args: RecordType[]) => FractionAggregator) =>
    (...outerArgs: any[]) => {
      const [data, rowKey, colKey] = outerArgs;
      const selectorMap: {
        total: [DataRecordValue[], DataRecordValue[]];
        row: [DataRecordValue, DataRecordValue[]];
        col: [DataRecordValue[], DataRecordValue];
      } = {
        total: [[], []],
        row: [rowKey, []],
        col: [[], colKey],
      };

      const selector = selectorMap[type];
      const inner = wrapped(...(x || []))(...outerArgs);

      return {
        selector,
        inner,
        push(record: RecordType): void {
          inner.push(record);
        },
        format: fmtNonString(formatter),
        value() {
          const acc = data.getAggregator(...(selector || [])).inner.value();

          if (typeof acc === 'string') {
            return acc;
          }

          return inner.value() / acc;
        },
        numInputs: wrapped(...(x || []))().numInputs,
      };
    },
};

const extendedAggregatorTemplates = {
  countUnique: (f = usFmtInt) =>
    baseAggregatorTemplates.uniques(x => x.length, f),

  listUnique: (s: string, f = (x: number) => String(x)) =>
    baseAggregatorTemplates.uniques(x => x.join(s), f),

  max: (f = usFmt) => baseAggregatorTemplates.extremes('max', f),

  min: (f = usFmt) => baseAggregatorTemplates.extremes('min', f),

  first: (f = usFmt) => baseAggregatorTemplates.extremes('first', f),

  last: (f = usFmt) => baseAggregatorTemplates.extremes('last', f),

  median: (f = usFmt) => baseAggregatorTemplates.quantile(0.5, f),

  average: (f = usFmt) => baseAggregatorTemplates.runningStat('mean', 1, f),

  var: (ddof = 1, f = usFmt) =>
    baseAggregatorTemplates.runningStat('var', ddof, f),

  stdev: (ddof = 1, f = usFmt) =>
    baseAggregatorTemplates.runningStat('stdev', ddof, f),
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
