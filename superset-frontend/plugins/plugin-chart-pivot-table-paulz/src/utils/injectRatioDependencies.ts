import { ensureIsArray, QueryFormMetric } from '@superset-ui/core';
import { RatioMetric } from '../types';
import { getItemName } from './getItemName';

export const injectRatioDependencies = (
  metrics: QueryFormMetric[],
  availableMetrics: QueryFormMetric[],
  ratioMetrics?: RatioMetric[],
): QueryFormMetric[] => {
  if (!ratioMetrics?.length) return metrics;

  const metricMap = new Map(availableMetrics.map(m => [getItemName(m), m]));

  const deps = ensureIsArray(ratioMetrics).flatMap(ratio => [
    ratio.numerator,
    ratio.denominator,
  ]);

  const injected = deps
    .map(dep => metricMap.get(dep))
    .filter(Boolean) as QueryFormMetric[];

  const merged = [...metrics, ...injected];

  return merged.filter(
    (m, i, arr) => arr.findIndex(x => getItemName(x) === getItemName(m)) === i,
  );
};
