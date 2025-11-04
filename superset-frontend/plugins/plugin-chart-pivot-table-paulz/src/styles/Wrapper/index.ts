import { styled } from '@superset-ui/core';
import { PivotTableStylesProps } from '../../types';

export const Wrapper = styled.div<PivotTableStylesProps>`
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
`;
