import { FC } from 'react';
import { Form, Input } from 'antd-v5';
import { t } from '@superset-ui/core';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { BaseFieldProps } from '../../../../../../types';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';

type InputNumberProps = Required<
  Pick<
    BaseFieldProps,
    'type' | 'name' | 'tooltipContent' | 'isRequired' | 'precision' | 'scale'
  >
>;

export const InputNumber: FC<InputNumberProps> = ({
  name,
  tooltipContent,
  isRequired,
  type,
  precision,
  scale,
}) => {
  const { editMode } = useComponentState();
  const { subd } = useDataWarehouse();
  const { dayFirst } = useColumnsSettings();

  return (
    <Form.Item
      name={name}
      label={t(name)}
      tooltip={tooltipContent}
      style={{ margin: 0 }}
      labelCol={{ style: { paddingBottom: 0 } }}
      wrapperCol={{ style: { paddingTop: 0 } }}
      validateTrigger={['onChange', 'onBlur']}
      rules={[
        {
          required: isRequired,
          message: 'Поле обязательно для заполнения',
        },
        {
          validator: (_, value) =>
            validateType(type, subd, dayFirst, {
              precision,
              scale,
            })(_, value),
        },
      ]}
    >
      <Input
        style={{ width: '100%' }}
        placeholder={type}
        disabled={editMode}
        allowClear
      />
    </Form.Item>
  );
};
