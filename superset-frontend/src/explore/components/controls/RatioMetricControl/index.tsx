import { FC, useCallback } from 'react';
import { Select, Button, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Flex } from 'antd-v5';
import ControlHeader, { ControlHeaderProps } from '../../ControlHeader';

export interface RatioMetric {
  ratio: string;
  numerator: string;
  denominator: string;
}

type RatioMetricControlProps = ControlHeaderProps & {
  value?: RatioMetric[];
  onChange: (value: RatioMetric[]) => void;
  choices: [string, string][];
};

const RatioMetricControl: FC<RatioMetricControlProps> = ({
  value = [],
  choices,
  name,
  label,
  description,
  renderTrigger,
  rightNode,
  leftNode,
  validationErrors,
  hovered,
  warning,
  danger,
  onClick,
  tooltipOnClick,
  onChange = () => {},
}) => {
  const headerProps = {
    name,
    label,
    description,
    renderTrigger,
    rightNode,
    leftNode,
    validationErrors,
    onClick,
    hovered,
    tooltipOnClick,
    warning,
    danger,
  };

  const update = useCallback(
    (idx: number, field: keyof RatioMetric, v: string) => {
      const next = [...value];
      next[idx] = { ...next[idx], [field]: v };
      onChange(next);
    },
    [value, onChange],
  );

  const add = () => {
    onChange([{ ratio: '', numerator: '', denominator: '' }, ...value]);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <>
      <ControlHeader {...headerProps} />
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={add}
        style={{ marginBottom: 8 }}
      >
        Add ratio
      </Button>

      {value.map((r, idx) => (
        <Flex
          key={idx}
          gap={5}
          align="center"
          wrap={false}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        >
          <Input
            placeholder="Ratio name"
            value={r.ratio}
            onChange={e => update(idx, 'ratio', e.target.value)}
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
    </>
  );
};

export default RatioMetricControl;
