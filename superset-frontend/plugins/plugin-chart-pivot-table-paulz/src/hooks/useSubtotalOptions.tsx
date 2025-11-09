import { useMemo } from 'react';
import { PivotTableProps } from '../types';
import { StyledMinusSquareOutlined, StyledPlusSquareOutlined } from '../styles';

export const useSubtotalOptions = ({
  colSubtotalPosition,
  rowSubtotalPosition,
}: Pick<PivotTableProps, 'colSubtotalPosition' | 'rowSubtotalPosition'>) =>
  useMemo(
    () => ({
      colSubtotalDisplay: { displayOnTop: colSubtotalPosition },
      rowSubtotalDisplay: { displayOnTop: rowSubtotalPosition },
      arrowCollapsed: <StyledPlusSquareOutlined />,
      arrowExpanded: <StyledMinusSquareOutlined />,
    }),
    [colSubtotalPosition, rowSubtotalPosition],
  );
