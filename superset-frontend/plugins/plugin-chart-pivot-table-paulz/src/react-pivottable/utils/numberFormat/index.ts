const addSeparators = (
  nStr: number | string,
  thousandsSep: string,
  decimalSep: string,
): string => {
  const x = String(nStr).split('.');
  let x1 = x[0];
  const x2 = x.length > 1 ? decimalSep + x[1] : '';
  const rgx = /(\d+)(\d{3})/;

  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, `$1${thousandsSep}$2`);
  }

  return x1 + x2;
};

export const numberFormat = (optsIn: {
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

  return (x: number): string => {
    if (Number.isNaN(x) || !Number.isFinite(x)) {
      return '';
    }

    const scaled = (opts.scaler * x).toFixed(opts.digitsAfterDecimal);
    const result = addSeparators(scaled, opts.thousandsSep, opts.decimalSep);

    return `${opts.prefix}${result}${opts.suffix}`;
  };
};
