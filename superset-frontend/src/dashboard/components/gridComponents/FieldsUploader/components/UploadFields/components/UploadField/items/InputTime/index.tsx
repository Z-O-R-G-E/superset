import { Form } from 'antd-v5';
import { t } from '@superset-ui/core';
import { FC } from 'react';
import { InputType } from '../../../../../../types';

export const InputTime: FC<InputType> = ({
  isRequired,
  name,
  tooltipContent,
}) => (
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
    ]}
  />
);
