import { styled } from '@superset-ui/core';

export const Layout = styled.div`
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-areas:
    'aggr . metric'
    '. transpose column'
    'row row content';
  grid-template-columns: 8rem 2rem auto;
  grid-template-rows: 2rem 2rem auto;
  gap: 2px;
  padding: 2px;
`;
