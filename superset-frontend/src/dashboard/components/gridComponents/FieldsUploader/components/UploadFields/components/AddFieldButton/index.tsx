import { FC, memo } from 'react';
import { Button, Typography } from 'antd-v5';
import { t } from '@superset-ui/core';

export const AddFieldButton: FC<{ onClick: () => void }> = memo(
  ({ onClick }) => (
    <Button
      htmlType="button"
      aria-label={t('Добавить поле')}
      style={{ minWidth: '3rem' }}
      onClick={onClick}
    >
      <Typography.Text style={{ color: 'inherit' }} ellipsis>
        {t('Добавить поле')}
      </Typography.Text>
    </Button>
  ),
);
