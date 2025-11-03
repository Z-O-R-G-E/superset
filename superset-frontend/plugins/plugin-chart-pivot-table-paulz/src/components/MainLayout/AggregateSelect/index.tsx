import { Flex, Select } from 'antd-v5';
import React, { FC } from 'react';
import { AGGREGATE_FUNCTION_CHOICES } from '../../../constants';

interface AggregateSelectProps {
  aggregateFunction: string;
  handleAggregateChange: (value: string) => void;
}

export const AggregateSelect: FC<AggregateSelectProps> = ({
  aggregateFunction,
  handleAggregateChange,
}) => (
  <Flex
    style={{
      gridArea: 'aggr',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0.5rem',
    }}
  >
    <Select
      key="aggregateSelect"
      size="small"
      style={{ margin: 0, width: '100%' }}
      dropdownStyle={{ minWidth: 'auto', backgroundColor: '#ffffff' }}
      popupMatchSelectWidth={false}
      showSearch
      placeholder="Select a person"
      optionFilterProp="label"
      value={aggregateFunction}
      onChange={handleAggregateChange}
      options={AGGREGATE_FUNCTION_CHOICES}
    />
  </Flex>
);
