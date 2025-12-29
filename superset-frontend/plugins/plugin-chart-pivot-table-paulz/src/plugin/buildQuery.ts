import {
  AdhocColumn,
  AdhocMetric,
  buildQueryContext,
  ensureIsArray,
  isPhysicalColumn,
  QueryFormColumn,
  QueryFormOrderBy,
} from '@superset-ui/core';
import { PivotTableQueryFormData } from '../types';
import { getItemName } from '../utils/getItemName';
import { resolveRatioMetrics } from '../utils/resolveRatioMetrics';

export default function buildQuery(formData: PivotTableQueryFormData) {
  const { extra_form_data, availableFields } = formData;
  let { groupbyColumns = [], groupbyRows = [] } = formData;
  const time_grain_sqla =
    extra_form_data?.time_grain_sqla || formData.time_grain_sqla;

  const allowedFields = new Set(
    ensureIsArray(availableFields).map(af => getItemName(af)),
  );
  groupbyColumns = ensureIsArray(groupbyColumns).filter(column =>
    allowedFields.has(getItemName(column)),
  );
  groupbyRows = ensureIsArray(groupbyRows).filter(row =>
    allowedFields.has(getItemName(row)),
  );

  // TODO: add deduping of AdhocColumns
  const columns = Array.from(
    new Set([
      ...ensureIsArray<QueryFormColumn>(groupbyColumns),
      ...ensureIsArray<QueryFormColumn>(groupbyRows),
    ]),
  ).map(col => {
    if (
      isPhysicalColumn(col) &&
      time_grain_sqla &&
      (formData?.temporal_columns_lookup?.[col] ||
        formData.granularity_sqla === col)
    ) {
      return {
        timeGrain: time_grain_sqla,
        columnType: 'BASE_AXIS',
        sqlExpression: col,
        label: col,
        expressionType: 'SQL',
      } as AdhocColumn;
    }
    return col;
  });

  return buildQueryContext(formData, baseQueryObject => {
    const { series_limit_metric, order_desc } = baseQueryObject;
    let { metrics } = baseQueryObject;
    const { availableMetrics: rawAvailableMetrics, ratios } = formData;

    const availableMetrics = resolveRatioMetrics(rawAvailableMetrics, ratios);

    const allowedMetrics = new Set(
      ensureIsArray(availableMetrics).map(am => getItemName(am)),
    );
    metrics = ensureIsArray(metrics).filter(metric =>
      allowedMetrics.has(getItemName(metric)),
    );

    if (!metrics || metrics.length === 0) {
      metrics = [
        {
          expressionType: 'SQL',
          sqlExpression: 'COUNT(1)',
          label: '__pivot_count',
        } as AdhocMetric,
      ];
    }

    let orderby: QueryFormOrderBy[] | undefined;
    if (series_limit_metric) {
      orderby = [[series_limit_metric, !order_desc]];
    } else if (metrics[0]) {
      orderby = [[metrics[0], !order_desc]];
    }

    return [
      {
        ...baseQueryObject,
        availableMetrics,
        metrics,
        orderby,
        columns,
      },
    ];
  });
}
