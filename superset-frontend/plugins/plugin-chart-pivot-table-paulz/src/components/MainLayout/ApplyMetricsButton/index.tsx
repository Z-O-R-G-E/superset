import { Button, Flex } from 'antd-v5';
import { FC, useMemo } from 'react';
import { RadiusSettingOutlined } from '@ant-design/icons';
import { MetricsLayoutEnum } from '../../../types';

interface TransposeButtonProps {
  handleMetricsLayoutChange: () => void;
  metricsLayout?: MetricsLayoutEnum;
}

export const ApplyMetricsButton: FC<TransposeButtonProps> = ({
  handleMetricsLayoutChange,
  metricsLayout,
}) => {
  const label = useMemo(() => {
    switch (metricsLayout) {
      case MetricsLayoutEnum.ROWS:
        return 'Строкам';
      default:
        return 'Столбцам';
    }
  }, [metricsLayout]);

  return (
    <Flex
      className="apply-metrics-button"
      style={{
        gridArea: 'applyMetrics',
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
        icon={
          <RadiusSettingOutlined style={{ width: '100%', height: '100%' }} />
        }
        onClick={handleMetricsLayoutChange}
      >
        {label}
      </Button>
    </Flex>
  );
};
