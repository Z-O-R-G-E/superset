import { styled } from '@superset-ui/core';
import { PaulZPivotTableStylesProps } from '../../types';

export const Wrapper = styled.div<PaulZPivotTableStylesProps>`
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
`;
