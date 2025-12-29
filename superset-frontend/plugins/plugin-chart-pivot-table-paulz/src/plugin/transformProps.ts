import {
  AdhocMetric,
  AdhocMetricSimple,
  ChartProps,
  DataRecord,
  ensureIsArray,
  extractTimegrain,
  GenericDataType,
  getTimeFormatter,
  getTimeFormatterForGranularity,
  QueryFormData,
  SMART_DATE_ID,
  TimeFormats,
} from '@superset-ui/core';
import { getColorFormatters } from '@superset-ui/chart-controls';
import { DateFormatter, MetricsLayoutEnum, RatioMetric } from '../types';

const { DATABASE_DATETIME } = TimeFormats;

function isNumeric(key: string, data: DataRecord[] = []) {
  return data.every(
    record =>
      record[key] === null ||
      record[key] === undefined ||
      typeof record[key] === 'number',
  );
}

export default function transformProps(chartProps: ChartProps<QueryFormData>) {
  const {
    width,
    height,
    queriesData,
    formData,
    rawFormData,
    hooks: { setDataMask = () => {}, setControlValue, onContextMenu },
    filterState,
    datasource: { verboseMap = {}, columnFormats = {}, currencyFormats = {} },
    emitCrossFilters,
  } = chartProps;
  const { data, colnames, coltypes } = queriesData[0];
  const {
    groupbyRows,
    groupbyColumns,
    availableFields,
    metrics: rawMetrics,
    availableMetrics: rawAvailableMetrics,
    tableRenderer,
    colOrder,
    rowOrder,
    aggregateFunction = 'Sum',
    transposePivot,
    combineMetric,
    rowSubtotalPosition,
    colSubtotalPosition,
    colTotals,
    colSubTotals,
    rowTotals,
    rowSubTotals,
    valueFormat,
    dateFormat,
    metricsLayout = MetricsLayoutEnum.COLUMNS,
    conditionalFormatting,
    timeGrainSqla,
    currencyFormat,
    ratios,
  } = formData;

  const metrics = ensureIsArray(rawMetrics);

  const availableRatioMetrics = rawAvailableMetrics.filter(
    (value: AdhocMetric) => value?.expressionType === 'SIMPLE',
  );

  const ratioMetrics = ratios
    ?.filter(({ label, numerator, denominator }: RatioMetric) =>
      Boolean(label && numerator && denominator),
    )
    .map(({ label, numerator, denominator }: RatioMetric) => {
      const findMetric = (label: string) =>
        availableRatioMetrics.find((m: AdhocMetricSimple) => m.label === label);

      const num = findMetric(numerator);
      const denom = findMetric(denominator);

      if (!num || !denom) return null;

      const toSql = ({ aggregate, column }: AdhocMetricSimple) =>
        `${aggregate}(${column.column_name})`;

      return {
        expressionType: 'SQL',
        sqlExpression: `${toSql(num)}/${toSql(denom)}`,
        column: null,
        aggregate: null,
        datasourceWarning: false,
        hasCustomLabel: true,
        label,
        optionName: `ratio-${label}-${toSql(num)}/${toSql(denom)}`,
      };
    })
    .filter(Boolean);

  const availableMetrics = ratioMetrics
    ? [...rawAvailableMetrics, ...ratioMetrics]
    : rawAvailableMetrics;

  const { selectedFilters } = filterState;
  const granularity = extractTimegrain(rawFormData);

  const dateFormatters = colnames
    .filter(
      (colname: string, index: number) =>
        coltypes[index] === GenericDataType.Temporal,
    )
    .reduce(
      (
        acc: Record<string, DateFormatter | undefined>,
        temporalColname: string,
      ) => {
        let formatter: DateFormatter | undefined;
        if (dateFormat === SMART_DATE_ID) {
          if (granularity) {
            // time column use formats based on granularity
            formatter = getTimeFormatterForGranularity(granularity);
          } else if (isNumeric(temporalColname, data)) {
            formatter = getTimeFormatter(DATABASE_DATETIME);
          } else {
            // if no column-specific format, print cell as is
            formatter = String;
          }
        } else if (dateFormat) {
          formatter = getTimeFormatter(dateFormat);
        }
        if (formatter) {
          acc[temporalColname] = formatter;
        }
        return acc;
      },
      {},
    );
  const metricColorFormatters = getColorFormatters(conditionalFormatting, data);

  return {
    width,
    height,
    data,
    groupbyRows,
    groupbyColumns,
    availableFields,
    metrics,
    availableMetrics,
    tableRenderer,
    colOrder,
    rowOrder,
    aggregateFunction,
    transposePivot,
    combineMetric,
    rowSubtotalPosition,
    colSubtotalPosition,
    colTotals,
    colSubTotals,
    rowTotals,
    rowSubTotals,
    valueFormat,
    currencyFormat,
    emitCrossFilters,
    setDataMask,
    setControlValue,
    selectedFilters,
    verboseMap,
    columnFormats,
    currencyFormats,
    metricsLayout,
    metricColorFormatters,
    dateFormatters,
    onContextMenu,
    timeGrainSqla,
    ratios,
  };
}
