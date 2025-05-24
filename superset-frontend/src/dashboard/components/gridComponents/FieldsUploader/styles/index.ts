import { css, styled } from '@superset-ui/core';

export const FieldUploaderStyles = styled.div(
  ({ theme }) => css`
    &.dashboard-field-uploader {
      overflow: hidden;

      h4,
      h5,
      h6 {
        font-weight: ${theme.typography.weights.normal};
      }

      h5 {
        color: ${theme.colors.grayscale.base};
      }

      h6 {
        font-size: ${theme.typography.sizes.s}px;
      }

      .dashboard-component-chart-holder {
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .dashboard--editing & {
        cursor: move;
      }
    }
  `,
);
