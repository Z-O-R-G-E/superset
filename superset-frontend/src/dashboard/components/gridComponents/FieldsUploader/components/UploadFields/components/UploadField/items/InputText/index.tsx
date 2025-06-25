import { Form, Input } from 'antd-v5';
import { t } from '@superset-ui/core';
import { FC } from 'react';
import { InputType } from '../../../../../../types';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';

type InputTextProps = InputType & {
  type: string;
  hasCounter: boolean;
  size?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
};

export const InputText: FC<InputTextProps> = ({
  type,
  hasCounter,
  size,
  isRequired,
  name,
  tooltipContent,
  precision,
  scale,
  enumValues,
}) => {
  const { editMode } = useComponentState();
  const { dayFirst } = useColumnsSettings();
  const { subd } = useDataWarehouse();

  return (
    <Form.Item
      style={{ margin: 0 }}
      labelCol={{ style: { paddingBottom: 0 } }}
      wrapperCol={{ style: { paddingTop: 0 } }}
      name={name}
      label={t(name)}
      tooltip={tooltipContent}
      validateTrigger={['onChange', 'onBlur']}
      required={isRequired}
      rules={[
        {
          required: isRequired,
          message: 'Поле обязательно для заполнения',
        },
        {
          validator: (_, value) =>
            validateType(type, subd, dayFirst, {
              size,
              enumValues,
              precision,
              scale,
            })(_, value),
        },
      ]}
    >
      <Input
        placeholder={type}
        allowClear
        disabled={editMode}
        style={{ width: '100%' }}
        count={{ show: hasCounter, max: size }}
      />
    </Form.Item>
  );
};
