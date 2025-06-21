import { FC } from 'react';
import { Tag, Tooltip, Typography } from 'antd-v5';
import { t } from '@superset-ui/core';

const { Text } = Typography;

interface StatusItemProps {
  label: string;
  value: any;
  successContent: React.ReactNode;
  tooltip: string;
  errorType?: 'error' | 'warning' | 'success';
  show: boolean;
}

export const StatusItem: FC<StatusItemProps> = ({
  label,
  value,
  successContent,
  tooltip,
  errorType = 'error',
  show,
}) => (
  <div style={{ display: show ? 'block' : 'none', overflow: 'hidden' }}>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
      }}
    >
      <Text strong style={{ whiteSpace: 'nowrap' }}>
        {label}:
      </Text>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: '3rem',
        }}
      >
        {value ? (
          <Tag
            color="success"
            style={{
              marginInlineEnd: 0,
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {successContent}
            </span>
          </Tag>
        ) : (
          <Tooltip
            title={<span style={{ whiteSpace: 'pre-line' }}>{t(tooltip)}</span>}
          >
            <Tag
              color={errorType}
              style={{
                marginInlineEnd: 0,
                maxWidth: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Не выбрано
              </span>
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  </div>
);
