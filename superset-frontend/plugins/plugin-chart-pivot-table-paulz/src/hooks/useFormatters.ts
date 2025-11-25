import { useMemo } from 'react';
import { CurrencyFormatter, getNumberFormatter } from '@superset-ui/core';
import { METRIC_KEY } from '../constants';
import { FormattersProps } from '../types';

export const useFormatters = ({
  valueFormat,
  currencyFormat,
  columnFormats,
  currencyFormats,
}: FormattersProps) => {
  const defaultFormatter = useMemo(
    () =>
      currencyFormat?.symbol
        ? new CurrencyFormatter({
            currency: currencyFormat,
            d3Format: valueFormat,
          })
        : getNumberFormatter(valueFormat),
    [valueFormat, currencyFormat],
  );

  const customFormatsArray = useMemo(
    () =>
      [
        ...new Set([
          ...Object.keys(columnFormats || {}),
          ...Object.keys(currencyFormats || {}),
        ]),
      ].map(metricName => [
        metricName,
        columnFormats[metricName] || valueFormat,
        currencyFormats[metricName] || currencyFormat,
      ]),
    [columnFormats, currencyFormat, currencyFormats, valueFormat],
  );

  const hasCustomMetricFormatters = customFormatsArray.length > 0;

  const metricFormatters = useMemo(
    () =>
      hasCustomMetricFormatters
        ? {
            [METRIC_KEY]: Object.fromEntries(
              customFormatsArray.map(([metric, d3Format, currency]) => [
                metric,
                currency
                  ? new CurrencyFormatter({
                      currency,
                      d3Format,
                    })
                  : getNumberFormatter(d3Format),
              ]),
            ),
          }
        : undefined,
    [customFormatsArray, hasCustomMetricFormatters],
  );

  return {
    defaultFormatter,
    metricFormatters,
  };
};
