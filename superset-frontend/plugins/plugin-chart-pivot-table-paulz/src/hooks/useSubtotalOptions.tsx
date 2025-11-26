import { useMemo } from 'react';
import {
  StyledMinusSquareOutlined,
  StyledPlusSquareOutlined,
} from '../components/styled';

export interface SubtotalOptionsProps {
  colSubtotalPosition: boolean;
  rowSubtotalPosition: boolean;
}

export type SubtotalOptionsType = ReturnType<typeof useSubtotalOptions>;

export const useSubtotalOptions = ({
  colSubtotalPosition,
  rowSubtotalPosition,
}: SubtotalOptionsProps) =>
  useMemo(
    () => ({
      colSubtotalDisplay: { displayOnTop: colSubtotalPosition },
      rowSubtotalDisplay: { displayOnTop: rowSubtotalPosition },
      arrowCollapsed: <StyledPlusSquareOutlined /> ?? '\u25B2',
      arrowExpanded: <StyledMinusSquareOutlined /> ?? '\u25BC',
    }),
    [colSubtotalPosition, rowSubtotalPosition],
  );
