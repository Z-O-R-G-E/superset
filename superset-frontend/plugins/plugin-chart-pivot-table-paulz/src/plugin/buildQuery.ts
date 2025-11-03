import {
  AdhocColumn,
  buildQueryContext,
  ensureIsArray,
  isPhysicalColumn,
  QueryFormColumn,
  QueryFormOrderBy,
} from '@superset-ui/core';
import { PivotTableQueryFormData } from '../types';

export default function buildQuery(formData: PivotTableQueryFormData) {
  const { groupbyColumns = [], groupbyRows = [], extra_form_data } = formData;
  const time_grain_sqla =
    extra_form_data?.time_grain_sqla || formData.time_grain_sqla;

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
    const { series_limit_metric, metrics, order_desc } = baseQueryObject;

    const safeMetrics = ensureIsArray(metrics);

    if (
      safeMetrics.length === 0 &&
      Array.isArray(formData.availableMetrics) &&
      formData.availableMetrics[0]
    ) {
      const first = formData.availableMetrics[0];
      safeMetrics.push(
        typeof first === 'string' ? first : (first as any).value ?? first,
      );
    }

    let orderBy: QueryFormOrderBy[] | undefined;
    if (series_limit_metric) {
      orderBy = [[series_limit_metric, !order_desc]];
    } else if (safeMetrics[0]) {
      orderBy = [[safeMetrics[0], !order_desc]];
    }

    return [
      {
        ...baseQueryObject,
        metrics: safeMetrics,
        orderby: orderBy,
        columns,
      },
    ];
  });
}
