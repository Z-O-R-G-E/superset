import { FC, useMemo } from 'react';
import { Flex, Select } from 'antd-v5';
import { useTheme } from '@superset-ui/core';
import { AGGREGATE_FUNCTION_CHOICES } from '../../../constants';

interface AggregateSelectProps {
  aggregateFunction: string;
  handleAggregateChange: (value: string) => void;
}

export const AggregateSelect: FC<AggregateSelectProps> = ({
  aggregateFunction,
  handleAggregateChange,
}) => {
  const theme = useTheme();

  const dropdownStyle = useMemo(
    () => ({
      minWidth: 'auto',
      backgroundColor: theme.colors.grayscale.light5,
    }),
    [theme.colors.grayscale.light5],
  );

  return (
    <Flex
      className="aggregate-select"
      style={{
        gridArea: 'aggr',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.5rem',
      }}
    >
      <Select
        size="small"
        style={{ margin: 0, width: '100%' }}
        dropdownStyle={dropdownStyle}
        popupMatchSelectWidth={false}
        showSearch
        optionFilterProp="label"
        value={aggregateFunction}
        onChange={handleAggregateChange}
        options={AGGREGATE_FUNCTION_CHOICES}
      />
    </Flex>
  );
};
