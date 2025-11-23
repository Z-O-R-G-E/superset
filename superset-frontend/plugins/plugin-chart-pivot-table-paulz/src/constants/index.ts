import { NumberFormatter, t } from '@superset-ui/core';
import { aggregatorTemplates } from '../react-pivottable/utilities';

export const METRIC_KEY = t('Metric');
export const VALS = ['value'];

export const CONTAINER_TYPES = {
  METRIC: 'metric',
  COLUMN: 'column',
  ROW: 'row',
} as const;

export const DND_ACCEPT_TYPE = {
  FIELD: 'dndField',
  METRIC: 'dndMetric',
} as const;

export const AGGREGATE_FUNCTION_CHOICES = [
  { value: 'Count', label: t('Count') },
  { value: 'Count Unique Values', label: t('Count Unique Values') },
  { value: 'List Unique Values', label: t('List Unique Values') },
  { value: 'Sum', label: t('Sum') },
  { value: 'Average', label: t('Average') },
  { value: 'Median', label: t('Median') },
  { value: 'Sample Variance', label: t('Sample Variance') },
  { value: 'Sample Standard Deviation', label: t('Sample Standard Deviation') },
  { value: 'Minimum', label: t('Minimum') },
  { value: 'Maximum', label: t('Maximum') },
  { value: 'First', label: t('First') },
  { value: 'Last', label: t('Last') },
  { value: 'Sum as Fraction of Total', label: t('Sum as Fraction of Total') },
  { value: 'Sum as Fraction of Rows', label: t('Sum as Fraction of Rows') },
  {
    value: 'Sum as Fraction of Columns',
    label: t('Sum as Fraction of Columns'),
  },
  {
    value: 'Count as Fraction of Total',
    label: t('Count as Fraction of Total'),
  },
  { value: 'Count as Fraction of Rows', label: t('Count as Fraction of Rows') },
  {
    value: 'Count as Fraction of Columns',
    label: t('Count as Fraction of Columns'),
  },
];

export const aggregatorsFactory = (formatter: NumberFormatter) => ({
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
