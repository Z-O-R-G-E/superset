import { Button, Flex } from 'antd-v5';
import { FC } from 'react';
import { RadiusSettingOutlined } from '@ant-design/icons';
import { MetricsLayoutEnum } from '../../../types';

interface TransposeButtonProps {
  handleMetricsLayoutChange: () => void;
  metricsLayout?: MetricsLayoutEnum;
}

export const TransposeButton: FC<TransposeButtonProps> = ({
  handleMetricsLayoutChange,
  metricsLayout,
}) => (
  <Flex
    className="transpose-button"
    style={{
      gridArea: 'transpose',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0.5rem',
    }}
  >
    <Button
      type="link"
      style={{
        width: '1.3rem',
        height: '1.3rem',
      }}
      icon={<RadiusSettingOutlined style={{ width: '100%', height: '100%' }} />}
      onClick={handleMetricsLayoutChange}
    >
      {metricsLayout}
    </Button>
  </Flex>
);
