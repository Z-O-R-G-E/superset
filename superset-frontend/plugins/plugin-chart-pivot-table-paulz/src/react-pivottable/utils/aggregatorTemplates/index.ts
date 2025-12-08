import { DataRecordValue } from '@superset-ui/core';
import { numberFormat } from '../numberFormat';
import { getSort } from '../getSort';
import { UnpivotedDataType } from '../../../hooks/usePivotData';

type NumberFormatter = (value: number) => string;
type CurrencyFormatter = (value: number) => string;
type Formatter = NumberFormatter | CurrencyFormatter;
type RecordType = number | string;
type RowKey = DataRecordValue;
type ColKey = DataRecordValue;

interface Aggregator {
  push: (record: RecordType) => void;
  value: () => any;
  format: Formatter;
  numInputs?: number;
  [key: string]: any;
}

interface FractionAggregator extends Aggregator {
  selector:
    | [DataRecordValue[], DataRecordValue[]]
    | [DataRecordValue, DataRecordValue[]]
    | [DataRecordValue[], DataRecordValue];
  inner: Aggregator;
}

const usFmt: Formatter = numberFormat({});
const usFmtInt: Formatter = numberFormat({ digitsAfterDecimal: 0 });
const usFmtPct: Formatter = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
});

const fmtNonString =
  (formatter: Formatter): ((x: string | number) => string) =>
  (x: string | number): string =>
    typeof x === 'string' ? x : formatter(x);

const baseAggregatorTemplates = {
  count:
    (formatter: Formatter = usFmtInt) =>
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
    (fn: (arr: RecordType[]) => RecordType, formatter: Formatter = usFmtInt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      const uniq: RecordType[] = [];

      return {
        push(record: RecordType): void {
          if (!uniq.includes(record[attr])) {
            uniq.push(record[attr]);
          }
        },
        value(): any {
          return fn(uniq);
        },
        format: fmtNonString(formatter),
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  sum:
    (formatter: Formatter = usFmt) =>
    ([attr]: [string]): (() => Aggregator) =>
    (): Aggregator => {
      let sum = 0;
      let stringValue: number | string | null = null;

      return {
        push(record: RecordType): void {
          const numValue = Number(record[attr]);
          if (Number.isNaN(numValue)) {
            stringValue = record[attr];
          } else {
            sum += parseFloat(record[attr]);
          }
        },
        value(): number | string {
          return stringValue !== null ? stringValue : sum;
        },
        format: fmtNonString(formatter),
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  extremes:
    (mode: 'min' | 'max' | 'first' | 'last', formatter: Formatter = usFmt) =>
    ([attr]: [string]): ((data?: UnpivotedDataType) => Aggregator) =>
    (data?: UnpivotedDataType): Aggregator => {
      let val: any = null;
      const sorter = getSort(data?.sorters ?? null, attr);

      return {
        push(record: RecordType): void {
          const x = record[attr];

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
              val = Math[mode as 'min' | 'max'](
                coercedValue,
                val !== null ? val : coercedValue,
              );
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
        value(): any {
          return val;
        },
        format(x: any): string {
          return typeof x === 'number' ? formatter(x) : x;
        },
        numInputs: typeof attr !== 'undefined' ? 0 : 1,
      };
    },

  quantile:
    (q: number, formatter: Formatter = usFmt) =>
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
        value(): any {
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
    (
      mode: 'mean' | 'var' | 'stdev' = 'mean',
      ddof = 1,
      formatter: Formatter = usFmt,
    ) =>
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
        value(): any {
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
    (formatter: Formatter = usFmt) =>
    ([num, denom]: [string, string]): (() => Aggregator) =>
    (): Aggregator => {
      let sumNum = 0;
      let sumDenom = 0;

      return {
        push(record: RecordType): void {
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
    (
      wrapped: any,
      type: 'total' | 'row' | 'col' = 'total',
      formatter: Formatter = usFmtPct,
    ) =>
    (...x: RecordType[]): ((...args: RecordType[]) => FractionAggregator) =>
    (...outerArgs: any[]): FractionAggregator => {
      const [data, rowKey, colKey] = outerArgs;
      const selectorMap = {
        total: [[], []] as [DataRecordValue[], DataRecordValue[]],
        row: [rowKey, []] as [RowKey, DataRecordValue[]],
        col: [[], colKey] as [DataRecordValue[], ColKey],
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
        value(): any {
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
  countUnique: (f: Formatter = usFmtInt) =>
    baseAggregatorTemplates.uniques(x => x.length, f),

  listUnique: (s: string, f: Formatter = x => String(x)) =>
    baseAggregatorTemplates.uniques(x => x.join(s), f),

  max: (f: Formatter = usFmt) => baseAggregatorTemplates.extremes('max', f),

  min: (f: Formatter = usFmt) => baseAggregatorTemplates.extremes('min', f),

  first: (f: Formatter = usFmt) => baseAggregatorTemplates.extremes('first', f),

  last: (f: Formatter = usFmt) => baseAggregatorTemplates.extremes('last', f),

  median: (f: Formatter = usFmt) => baseAggregatorTemplates.quantile(0.5, f),

  average: (f: Formatter = usFmt) =>
    baseAggregatorTemplates.runningStat('mean', 1, f),

  var: (ddof = 1, f: Formatter = usFmt) =>
    baseAggregatorTemplates.runningStat('var', ddof, f),

  stdev: (ddof = 1, f: Formatter = usFmt) =>
    baseAggregatorTemplates.runningStat('stdev', ddof, f),
};

const aggregatorTemplates = {
  ...baseAggregatorTemplates,
  ...extendedAggregatorTemplates,
};

const aggregators = ((tpl: typeof aggregatorTemplates) => ({
  Count: tpl.count(usFmtInt),
  'Count Unique Values': tpl.countUnique(usFmtInt),
  'List Unique Values': tpl.listUnique(', '),
  Sum: tpl.sum(usFmt),
  'Integer Sum': tpl.sum(usFmtInt),
  Average: tpl.average(usFmt),
  Median: tpl.median(usFmt),
  'Sample Variance': tpl.var(1, usFmt),
  'Sample Standard Deviation': tpl.stdev(1, usFmt),
  Minimum: tpl.min(usFmt),
  Maximum: tpl.max(usFmt),
  First: tpl.first(usFmt),
  Last: tpl.last(usFmt),
  'Sum over Sum': tpl.sumOverSum(usFmt),
  'Sum as Fraction of Total': tpl.fractionOf(tpl.sum(), 'total', usFmtPct),
  'Sum as Fraction of Rows': tpl.fractionOf(tpl.sum(), 'row', usFmtPct),
  'Sum as Fraction of Columns': tpl.fractionOf(tpl.sum(), 'col', usFmtPct),
  'Count as Fraction of Total': tpl.fractionOf(tpl.count(), 'total', usFmtPct),
  'Count as Fraction of Rows': tpl.fractionOf(tpl.count(), 'row', usFmtPct),
  'Count as Fraction of Columns': tpl.fractionOf(tpl.count(), 'col', usFmtPct),
}))(aggregatorTemplates);

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

export { aggregatorTemplates, aggregators };
export type {
  Aggregator,
  Formatter,
  RecordType,
  NumberFormatter,
  CurrencyFormatter,
  FractionAggregator,
};
