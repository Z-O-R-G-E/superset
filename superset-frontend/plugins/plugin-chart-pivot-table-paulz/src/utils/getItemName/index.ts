import {
  isQueryFormMetric,
  isQueryFormColumn,
  getColumnLabel,
  getMetricLabel,
} from '@superset-ui/core';
import { ItemType } from '../../types';

export function getItemName(item: ItemType): string {
  if (isQueryFormColumn(item)) return getColumnLabel(item);
  if (isQueryFormMetric(item)) return getMetricLabel(item);
  return '';
}
