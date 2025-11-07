import { styled } from '@superset-ui/core';

export const Layout = styled.div`
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-areas:
    'aggrDivider metricDivider'
    'aggr metric'
    'applyMetricsDivider columnDivider'
    'applyMetrics column'
    'rowDivider contentDivider'
    'row content';
  grid-template-columns: 10rem auto;
  grid-template-rows: 1rem 2rem 1rem 2rem 1rem auto;
  gap: 0.25rem;
`;
