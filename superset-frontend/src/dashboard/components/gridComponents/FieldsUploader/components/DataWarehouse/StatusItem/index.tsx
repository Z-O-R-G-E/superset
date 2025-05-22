import { FC } from 'react';
import { Tag, Tooltip, Space, Typography } from 'antd';
import { t } from '@superset-ui/core';

const { Text } = Typography;

interface StatusItemProps {
  label: string;
  value: any;
  successContent: React.ReactNode;
  tooltip: string;
  errorType?: 'error' | 'warning';
}

export const StatusItem: FC<StatusItemProps> = ({
  label,
  value,
  successContent,
  tooltip,
  errorType = 'error',
}) => (
  <Space
    align="center"
    wrap
    style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: '8px',
      rowGap: '0px',
    }}
  >
    <Text strong style={{ whiteSpace: 'nowrap' }}>
      {label}:
    </Text>
    {value ? (
      <Tag color="success" style={{ marginInlineEnd: 0 }}>
        {successContent}
      </Tag>
    ) : (
      <Tooltip title={t(tooltip)}>
        <Tag color={errorType} style={{ marginInlineEnd: 0 }}>
          {t('Не выбрано')}
        </Tag>
      </Tooltip>
    )}
  </Space>
);
