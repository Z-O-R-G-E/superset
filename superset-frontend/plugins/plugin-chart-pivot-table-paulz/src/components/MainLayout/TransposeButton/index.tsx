import { Button, Flex } from 'antd-v5';
import { FC } from 'react';
import { RadiusSettingOutlined } from '@ant-design/icons';

interface TransposeButtonProps {
  handleMetricsLayoutChange: () => void;
}

export const TransposeButton: FC<TransposeButtonProps> = ({
  handleMetricsLayoutChange,
}) => (
  <Flex
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
    />
  </Flex>
);
