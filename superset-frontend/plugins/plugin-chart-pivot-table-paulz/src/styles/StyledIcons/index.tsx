import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { styled } from '@superset-ui/core';

export const StyledPlusSquareOutlined = styled(PlusSquareOutlined)`
  stroke: ${({ theme }) => theme.colors.grayscale.light2};
  stroke-width: 16px;
`;

export const StyledMinusSquareOutlined = styled(MinusSquareOutlined)`
  stroke: ${({ theme }) => theme.colors.grayscale.light2};
  stroke-width: 16px;
`;
