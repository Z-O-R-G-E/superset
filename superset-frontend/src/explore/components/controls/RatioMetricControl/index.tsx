import { useCallback } from 'react';
import { Select, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Flex } from 'antd-v5';

export interface RatioMetric {
  ratio: string;
  numerator: string;
  denominator: string;
}

interface Props {
  value?: RatioMetric[];
  onChange: (value: RatioMetric[]) => void;
  choices: [string, string][];
}

export default function RatioMetricControl({
  value = [],
  onChange,
  choices,
}: Props) {
  const update = useCallback(
    (idx: number, field: keyof RatioMetric, v: string) => {
      const next = [...value];
      next[idx] = { ...next[idx], [field]: v };
      onChange(next);
    },
    [value, onChange],
  );

  const add = () => {
    onChange([...value, { ratio: '', numerator: '', denominator: '' }]);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <>
      {value.map((r, idx) => (
        <Flex
          key={idx}
          gap={5}
          align="center"
          wrap={false}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        >
          <Select
            placeholder="Ratio"
            value={r.ratio || undefined}
            options={choices.map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => update(idx, 'ratio', v)}
            style={{ flex: 1, minWidth: 0 }}
          />

          <Select
            placeholder="Numerator"
            value={r.numerator || undefined}
            options={choices.map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => update(idx, 'numerator', v)}
            style={{ flex: 1, minWidth: 0 }}
          />

          <Select
            placeholder="Denominator"
            value={r.denominator || undefined}
            options={choices.map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => update(idx, 'denominator', v)}
            style={{ flex: 1, minWidth: 0 }}
          />

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(idx)}
            style={{ flex: '0 0 32px' }}
          />
        </Flex>
      ))}

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={add}
        style={{ marginTop: 8 }}
      >
        Add ratio
      </Button>
    </>
  );
}
