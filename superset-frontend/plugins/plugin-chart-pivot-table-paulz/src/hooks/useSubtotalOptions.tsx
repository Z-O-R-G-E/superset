import { useMemo } from 'react';
import {
  StyledMinusSquareOutlined,
  StyledPlusSquareOutlined,
} from '../components/styled';
import { PivotTableProps } from '../types';

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
