/**
 * Основные типы
 */
export interface Aggregator {
  push: (record: any) => void;
  value: () => any;
  format: (x: any) => any;
  isSubtotal?: boolean;
  isRowSubtotal?: boolean;
  isColSubtotal?: boolean;
  // Любые дополнительные поля, которые создают шаблоны (count, sum, uniq и т.д.)
  [key: string]: any;
}

/* -------------------------
   Форматирование чисел
   ------------------------*/
const addSeparators = (
  nStr: string | number,
  thousandsSep: string,
  decimalSep: string,
) => {
  const x = String(nStr).split('.');
  let x1 = x[0];
  const x2 = x.length > 1 ? decimalSep + x[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, `$1${thousandsSep}$2`);
  }
  return x1 + x2;
};

export const numberFormat = (optsIn?: {
  digitsAfterDecimal?: number;
  scaler?: number;
  thousandsSep?: string;
  decimalSep?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const defaults = {
    digitsAfterDecimal: 2,
    scaler: 1,
    thousandsSep: ',',
    decimalSep: '.',
    prefix: '',
    suffix: '',
  };
  const opts = { ...defaults, ...optsIn };
  return function (x: number) {
    if (Number.isNaN(x) || !Number.isFinite(x)) {
      return '';
    }
    const result = addSeparators(
      (opts.scaler * x).toFixed(opts.digitsAfterDecimal),
      opts.thousandsSep,
      opts.decimalSep,
    );
    return `${opts.prefix}${result}${opts.suffix}`;
  };
};

/* -------------------------
   Сортировки / naturalSort
   ------------------------*/
const rx = /(\d+)|(\D+)/g;
const rd = /\d/;
const rz = /^0/;

export const naturalSort = (as: unknown, bs: unknown): number => {
  // nulls first
  if (bs !== null && as === null) return -1;
  if (as !== null && bs === null) return 1;

  // raw NaNs
  if (typeof as === 'number' && Number.isNaN(as)) return -1;
  if (typeof bs === 'number' && Number.isNaN(bs)) return 1;

  // numeric compare (numbers + number-like strings)
  const nas = Number(as);
  const nbs = Number(bs);

  if (!Number.isNaN(nas) && !Number.isNaN(nbs)) {
    if (nas < nbs) return -1;
    if (nas > nbs) return 1;

    // both are numeric or number-like
    if (typeof as === 'number' && typeof bs !== 'number') return -1;
    if (typeof bs === 'number' && typeof as !== 'number') return 1;

    return 0;
  }

  // comparing a non-numeric vs numeric-like string
  if (Number.isNaN(nas) && !Number.isNaN(nbs)) return 1;
  if (!Number.isNaN(nas) && Number.isNaN(nbs)) return -1;

  // now we are sure both are strings
  const a = String(as);
  const b = String(bs);

  if (a === b) return 0;

  // if no digits — simple lexicographical
  if (!rd.test(a) || !rd.test(b)) {
    return a > b ? 1 : -1;
  }

  // tokenize into numeric/text parts
  const ma = a.match(rx) ?? [];
  const mb = b.match(rx) ?? [];

  while (ma.length > 0 && mb.length > 0) {
    const a1 = ma.shift()!;
    const b1 = mb.shift()!;

    if (a1 === b1) continue;

    const aNum = rd.test(a1);
    const bNum = rd.test(b1);

    // number vs number
    if (aNum && bNum) {
      const na = Number(a1.replace(rz, '0.'));
      const nb = Number(b1.replace(rz, '0.'));
      if (na < nb) return -1;
      if (na > nb) return 1;
      continue;
    }

    // string vs string
    return a1 > b1 ? 1 : -1;
  }

  // shorter sequence wins
  return ma.length - mb.length;
};

export const sortAs = (order: any[]) => {
  const mapping: Record<string, number> = {};
  const lMapping: Record<string, number> = {};
  order.forEach((element, i) => {
    mapping[element] = i;
    if (typeof element === 'string') {
      lMapping[element.toLowerCase()] = i;
    }
  });
  return (a: any, b: any) => {
    if (a in mapping && b in mapping) return mapping[a] - mapping[b];
    if (a in mapping) return -1;
    if (b in mapping) return 1;
    if (a in lMapping && b in lMapping) return lMapping[a] - lMapping[b];
    if (a in lMapping) return -1;
    if (b in lMapping) return 1;
    return naturalSort(a, b);
  };
};

export const getSort = (sorters: any, attr: string) => {
  if (sorters) {
    if (typeof sorters === 'function') {
      const sort = sorters(attr);
      if (typeof sort === 'function') return sort;
    } else if (attr in sorters) {
      return sorters[attr];
    }
  }
  return naturalSort;
};

/* -------------------------
   Aggregator templates
   ------------------------*/

/**
 * Helpers
 */
const usFmt = numberFormat();
const usFmtInt = numberFormat({ digitsAfterDecimal: 0 });
const usFmtPct = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
});

const fmtNonString = (formatter: (x: any) => any) => (x: any) =>
  typeof x === 'string' ? x : formatter(x);

/**
 * Базовые шаблоны агрегаторов.
 * Каждый шаблон возвращает функцию, принимающую vals?: string[]
 * и возвращающую генератор агрегатора: (data?, rowKey?, colKey?) => Aggregator
 */
export const baseAggregatorTemplates = {
  count(formatter = usFmtInt) {
    return () => () =>
      ({
        count: 0,
        push() {
          this.count += 1;
        },
        value() {
          return this.count;
        },
        format: formatter,
      }) as Aggregator;
  },

  uniques(fn: (arr: any[]) => any, formatter = usFmtInt) {
    return ([attr]: string[] = []) =>
      () =>
        ({
          uniq: [] as any[],
          push(record: any) {
            if (!(this.uniq as any[]).includes(record[attr])) {
              (this.uniq as any[]).push(record[attr]);
            }
          },
          value() {
            return fn(this.uniq as any[]);
          },
          format: fmtNonString(formatter),
          numInputs: attr !== undefined ? 1 : 0,
        }) as Aggregator;
  },

  sum(formatter = usFmt) {
    return ([attr]: string[] = []) =>
      () =>
        ({
          sum: 0,
          push(record: any) {
            if (Number.isNaN(Number(record[attr]))) {
              this.sum = record[attr];
            } else {
              this.sum += parseFloat(record[attr]);
            }
          },
          value() {
            return this.sum;
          },
          format: fmtNonString(formatter),
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }) as Aggregator;
  },

  extremes(mode: 'min' | 'max' | 'first' | 'last', formatter = usFmt) {
    return ([attr]: string[] = []) =>
      (data?: any) =>
        ({
          val: null as any,
          sorter: getSort(
            typeof data !== 'undefined' ? data.sorters : null,
            attr,
          ),
          push(record: any) {
            const x = record[attr];
            if (['min', 'max'].includes(mode)) {
              const coercedValue = Number(x);
              if (Number.isNaN(coercedValue)) {
                this.val =
                  !this.val ||
                  (mode === 'min' && x < this.val) ||
                  (mode === 'max' && x > this.val)
                    ? x
                    : this.val;
              } else {
                this.val = Math[mode](
                  coercedValue,
                  this.val !== null ? this.val : coercedValue,
                );
              }
            } else if (
              mode === 'first' &&
              this.sorter(x, this.val !== null ? this.val : x) <= 0
            ) {
              this.val = x;
            } else if (
              mode === 'last' &&
              this.sorter(x, this.val !== null ? this.val : x) >= 0
            ) {
              this.val = x;
            }
          },
          value() {
            return this.val;
          },
          format(x: any) {
            if (typeof x === 'number') return formatter(x);
            return x;
          },
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }) as Aggregator;
  },

  quantile(q: number, formatter = usFmt) {
    return ([attr]: string[] = []) =>
      () =>
        ({
          vals: [] as number[],
          strMap: {} as Record<string, number>,
          push(record: any) {
            const val = record[attr];
            const x = Number(val);
            if (Number.isNaN(x)) {
              this.strMap[val] = (this.strMap[val] || 0) + 1;
            } else {
              this.vals.push(x);
            }
          },
          value() {
            if (
              this.vals.length === 0 &&
              Object.keys(this.strMap).length === 0
            ) {
              return null;
            }

            if (Object.keys(this.strMap).length) {
              const values: number[] = (
                Object.values(this.strMap) as number[]
              ).sort((a, b) => a - b);
              const middle = Math.floor(values.length / 2);

              const keys = Object.keys(this.strMap);
              return keys.length % 2 !== 0
                ? keys[middle]
                : (Number(keys[middle - 1]) + Number(keys[middle])) / 2;
            }

            this.vals.sort((a: any, b: any) => a - b);
            const i = (this.vals.length - 1) * q;
            return (this.vals[Math.floor(i)] + this.vals[Math.ceil(i)]) / 2.0;
          },
          format: fmtNonString(formatter),
          numInputs: attr !== undefined ? 1 : 0,
        }) as Aggregator;
  },

  runningStat(
    mode: 'mean' | 'var' | 'stdev' = 'mean',
    ddof = 1,
    formatter = usFmt,
  ) {
    return ([attr]: string[] = []) =>
      () =>
        ({
          n: 0.0,
          m: 0.0,
          s: 0.0,
          strValue: null as any,
          push(record: any) {
            const x = Number(record[attr]);
            if (Number.isNaN(x)) {
              this.strValue =
                typeof record[attr] === 'string' ? record[attr] : this.strValue;
              return;
            }
            this.n += 1.0;
            if (this.n === 1.0) {
              this.m = x;
            }
            const mNew = this.m + (x - this.m) / this.n;
            this.s += (x - this.m) * (x - mNew);
            this.m = mNew;
          },
          value() {
            if (this.strValue) {
              return this.strValue;
            }
            if (mode === 'mean') {
              if (this.n === 0) {
                return 0 / 0;
              }
              return this.m;
            }
            if (this.n <= ddof) {
              return 0;
            }
            switch (mode) {
              case 'var':
                return this.s / (this.n - ddof);
              case 'stdev':
                return Math.sqrt(this.s / (this.n - ddof));
              default:
                throw new Error('unknown mode for runningStat');
            }
          },
          format: fmtNonString(formatter),
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }) as Aggregator;
  },

  sumOverSum(formatter = usFmt) {
    return ([num, denom]: string[] = []) =>
      () =>
        ({
          sumNum: 0,
          sumDenom: 0,
          push(record: any) {
            if (!Number.isNaN(Number(record[num]))) {
              this.sumNum += parseFloat(record[num]);
            }
            if (!Number.isNaN(Number(record[denom]))) {
              this.sumDenom += parseFloat(record[denom]);
            }
          },
          value() {
            return this.sumNum / this.sumDenom;
          },
          format: formatter,
          numInputs:
            typeof num !== 'undefined' && typeof denom !== 'undefined' ? 0 : 2,
        }) as Aggregator;
  },

  fractionOf(
    wrapped: (
      vals?: string[],
    ) => (data?: any, rowKey?: any[], colKey?: any[]) => Aggregator,
    type: 'total' | 'row' | 'col' = 'total',
    formatter = usFmtPct,
  ) {
    return (...x: any[]) =>
      (data: any, rowKey: any[], colKey: any[]) =>
        ({
          selector: { total: [[], []], row: [rowKey, []], col: [[], colKey] }[
            type
          ],
          inner: wrapped(...(x || []))(data, rowKey, colKey),
          push(record: any) {
            this.inner.push(record);
          },
          format: fmtNonString(formatter),
          value() {
            const acc = data
              .getAggregator(...(this.selector || []))
              .inner.value();
            if (typeof acc === 'string') return acc;
            return this.inner.value() / acc;
          },
          numInputs: wrapped(...(x || []))().numInputs,
        }) as Aggregator;
  },
};

/* -------------------------
   Расширенные шаблоны
   ------------------------*/
export const extendedAggregatorTemplates = {
  countUnique(f?: any) {
    return baseAggregatorTemplates.uniques((x: any[]) => x.length, f);
  },
  listUnique(s = ', ', f?: any) {
    return baseAggregatorTemplates.uniques(
      (x: any[]) => x.join(s),
      f || (x => x),
    );
  },
  max(f?: any) {
    return baseAggregatorTemplates.extremes('max', f);
  },
  min(f?: any) {
    return baseAggregatorTemplates.extremes('min', f);
  },
  first(f?: any) {
    return baseAggregatorTemplates.extremes('first', f);
  },
  last(f?: any) {
    return baseAggregatorTemplates.extremes('last', f);
  },
  median(f?: any) {
    return baseAggregatorTemplates.quantile(0.5, f);
  },
  average(f?: any) {
    return baseAggregatorTemplates.runningStat('mean', 1, f);
  },
  var(ddof = 1, f?: any) {
    return baseAggregatorTemplates.runningStat('var', ddof, f);
  },
  stdev(ddof = 1, f?: any) {
    return baseAggregatorTemplates.runningStat('stdev', ddof, f);
  },
};

/* -------------------------
   aggregatorTemplates и aggregators (фабрика)
   ------------------------*/
export const aggregatorTemplates = {
  ...baseAggregatorTemplates,
  ...extendedAggregatorTemplates,
};

// aggregators is an object mapping display-name -> function(vals?) => generator
export const aggregators: Record<
  string,
  (
    vals?: string[],
  ) => (data?: any, rowKey?: any[], colKey?: any[]) => Aggregator
> = ((tpl: typeof aggregatorTemplates) => ({
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

/* -------------------------
   locales
   ------------------------*/
export const locales = {
  en: {
    aggregators,
    localeStrings: {
      renderError: 'An error occurred rendering the PivotTable results.',
      computeError: 'An error occurred computing the PivotTable results.',
      uiRenderError: 'An error occurred rendering the PivotTable UI.',
      selectAll: 'Select All',
      selectNone: 'Select None',
      tooMany: '(too many to list)',
      filterResults: 'Filter values',
      apply: 'Apply',
      cancel: 'Cancel',
      totals: 'Totals',
      vs: 'vs',
      by: 'by',
    },
  },
};

/* -------------------------
   derivers
   ------------------------*/
const mthNamesEn = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const zeroPad = (number: number) => `0${number}`.substr(-2, 2);

export const derivers = {
  bin(col: string, binWidth: number) {
    return (record: any) => record[col] - (record[col] % binWidth);
  },

  dateFormat(
    col: string,
    formatString: string,
    utcOutput = false,
    mthNames = mthNamesEn,
    dayNames = dayNamesEn,
  ) {
    const utc = utcOutput ? 'UTC' : '';
    return (record: any) => {
      const date = new Date(Date.parse(record[col]));
      if (Number.isNaN(Number(date))) return '';
      return formatString.replace(/%(.)/g, (m, p) => {
        switch (p) {
          case 'y':
            return (date as any)[`get${utc}FullYear`]();
          case 'm':
            return zeroPad((date as any)[`get${utc}Month`]() + 1);
          case 'n':
            return (mthNames as string[])[(date as any)[`get${utc}Month`]()];
          case 'd':
            return zeroPad((date as any)[`get${utc}Date`]());
          case 'w':
            return (dayNames as string[])[(date as any)[`get${utc}Day`]()];
          case 'x':
            return (date as any)[`get${utc}Day`]();
          case 'H':
            return zeroPad((date as any)[`get${utc}Hours`]());
          case 'M':
            return zeroPad((date as any)[`get${utc}Minutes`]());
          case 'S':
            return zeroPad((date as any)[`get${utc}Seconds`]());
          default:
            return `%${p}`;
        }
      });
    };
  },
};

/* -------------------------
   flatKey
   ------------------------*/
export const flatKey = (attrVals: any[]) =>
  attrVals.join(String.fromCharCode(0));

/* -------------------------
   Экспорт
   ------------------------*/
export default {
  numberFormat,
  naturalSort,
  sortAs,
  getSort,
  aggregatorTemplates,
  aggregators,
  locales,
  derivers,
  flatKey,
};
