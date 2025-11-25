import { useMemo } from 'react';
import {
  StyledMinusSquareOutlined,
  StyledPlusSquareOutlined,
} from '../components/styled';
import { SubtotalOptionsProps } from '../types';

export const useSubtotalOptions = ({
  colSubtotalPosition,
  rowSubtotalPosition,
}: SubtotalOptionsProps) =>
  useMemo(
    () => ({
      colSubtotalDisplay: { displayOnTop: colSubtotalPosition },
      rowSubtotalDisplay: { displayOnTop: rowSubtotalPosition },
      arrowCollapsed: <StyledPlusSquareOutlined />,
      arrowExpanded: <StyledMinusSquareOutlined />,
    }),
    [colSubtotalPosition, rowSubtotalPosition],
  );
