import {
  Behavior,
  ChartMetadata,
  ChartPlugin,
  ChartProps,
  QueryFormData,
  t,
} from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import thumbnail from '../images/thumbnail.png';
import example from '../images/example.jpg';
import { PivotTableQueryFormData } from '../types';

export default class PivotTableChartPlugin extends ChartPlugin<
  PivotTableQueryFormData,
  ChartProps<QueryFormData>
> {
  constructor() {
    const metadata = new ChartMetadata({
      behaviors: [
        Behavior.InteractiveChart,
        Behavior.DrillToDetail,
        Behavior.DrillBy,
      ],
      category: t('Table'),
      description: t(
        'Used to summarize a set of data by grouping together multiple statistics along two axes. Examples: Sales numbers by region and month, tasks by status and assignee, active users by age and location. Not the most visually stunning visualization, but highly informative and versatile.',
      ),
      exampleGallery: [{ url: example }],
      name: t('PaulZ Pivot Table'),
      tags: [t('Additive'), t('Report'), t('Tabular'), t('Featured')],
      thumbnail,
    });

    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../PivotTableChart'),
      metadata,
      transformProps,
    });
  }
}
