import { t } from '@superset-ui/core';

export const METRIC_KEY = t('Metric');

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
  {
    value: 'Ratio',
    label: t('Ratio'),
  },
];
