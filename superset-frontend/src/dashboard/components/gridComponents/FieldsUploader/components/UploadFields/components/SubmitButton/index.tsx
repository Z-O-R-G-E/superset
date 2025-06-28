import { FC, memo } from 'react';
import { Button, Typography } from 'antd-v5';
import { t } from '@superset-ui/core';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';

export const SubmitButton: FC<{ isLoading: boolean }> = memo(
  ({ isLoading }) => (
    <Button
      htmlType="submit"
      aria-label={t('Загрузить')}
      style={{ minWidth: '3rem' }}
      icon={isLoading ? <LoadingOutlined /> : <UploadOutlined />}
      disabled={isLoading}
    >
      <Typography.Text style={{ color: 'inherit' }} ellipsis>
        {t('Загрузить')}
      </Typography.Text>
    </Button>
  ),
);
