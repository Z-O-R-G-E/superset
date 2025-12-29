import {
  AdhocMetric,
  AdhocMetricSimple,
  QueryFormMetric,
} from '@superset-ui/core';
import { RatioMetric } from '../../types';

export const resolveRatioMetrics = (
  availableMetrics: QueryFormMetric[],
  rawRatioMetrics: RatioMetric[],
): (QueryFormMetric | AdhocMetric | null)[] => {
  const availableRatioMetrics = availableMetrics.filter(
    (value: AdhocMetricSimple) => value?.expressionType === 'SIMPLE',
  ) as AdhocMetricSimple[];

  const ratioMetrics = rawRatioMetrics
    ?.filter(({ label, numerator, denominator }) =>
      Boolean(label && numerator && denominator),
    )
    .map(({ label, numerator, denominator }) => {
      const findMetric = (label: string) =>
        availableRatioMetrics.find(metric => metric.label === label);

      const num = findMetric(numerator);
      const denom = findMetric(denominator);

      if (!num || !denom) return null;

      const toSql = ({ aggregate, column }: AdhocMetricSimple) =>
        `${aggregate}(${column.column_name})`;

      return {
        expressionType: 'SQL',
        sqlExpression: `${toSql(num)}/${toSql(denom)}`,
        label,
      } as AdhocMetric;
    })
    .filter(Boolean);

  return ratioMetrics
    ? [...availableMetrics, ...ratioMetrics]
    : availableMetrics;
};
