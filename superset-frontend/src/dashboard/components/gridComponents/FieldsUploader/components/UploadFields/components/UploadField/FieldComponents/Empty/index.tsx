import { Tooltip, Typography } from 'antd-v5';
import { t, useTheme } from '@superset-ui/core';
import { FC } from 'react';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';

export const Empty: FC<{}> = () => {
  const theme = useTheme();
  const { editMode } = useComponentState();

  return (
    <Tooltip
      title={
        editMode
          ? t(
              'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
            )
          : ''
      }
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: editMode ? `0.2rem dashed ${theme.colors.grayscale.base}` : 0,
          color: theme.colors.grayscale.base,
          marginTop: '1.6rem',
          borderRadius: 6,
          padding: 11,
          width: 'inherit',
          height: '2rem',
        }}
      >
        {editMode && (
          <Typography.Text style={{ color: 'inherit' }} ellipsis>
            {t('Пустышка')}
          </Typography.Text>
        )}
      </div>
    </Tooltip>
  );
};
