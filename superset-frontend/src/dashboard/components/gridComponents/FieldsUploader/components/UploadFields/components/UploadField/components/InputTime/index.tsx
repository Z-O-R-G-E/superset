import { Form, TimePicker } from 'antd-v5';
import { FC } from 'react';
import { t } from '@superset-ui/core';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { BaseFieldProps } from '../../../../../../types';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';

type InputTimeProps = Required<
  Pick<BaseFieldProps, 'type' | 'name' | 'tooltipContent' | 'isRequired'>
>;

export const InputTime: FC<InputTimeProps> = ({
  name,
  tooltipContent,
  isRequired,
  type,
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
          validator: (_, value) => validateType(type, subd, dayFirst)(_, value),
        },
      ]}
    >
      <TimePicker style={{ width: '100%' }} disabled={editMode} allowClear />
    </Form.Item>
  );
};
