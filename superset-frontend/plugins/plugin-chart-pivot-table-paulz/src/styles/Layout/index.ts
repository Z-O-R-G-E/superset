import { styled } from '@superset-ui/core';

export const Layout = styled.div`
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-areas:
    'aggr metric'
    'aggr column'
    'row content';
  grid-template-columns: 10rem auto;
  grid-template-rows: 3rem 3rem auto;
  gap: 2px;
  padding: 2px;
`;
