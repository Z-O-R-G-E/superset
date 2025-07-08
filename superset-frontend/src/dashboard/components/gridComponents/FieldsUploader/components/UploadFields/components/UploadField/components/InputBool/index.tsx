import { Checkbox, Form } from 'antd-v5';
import { FC } from 'react';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { BaseFieldProps } from '../../../../../../types';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';

type InputBoolProps = Required<
  Pick<BaseFieldProps, 'type' | 'name' | 'tooltipContent' | 'isRequired'>
>;

export const InputBool: FC<InputBoolProps> = ({
  type,
  name,
  tooltipContent,
  isRequired,
}) => {
  const { editMode } = useComponentState();
  const { subd } = useDataWarehouse();
  const { dayFirst } = useColumnsSettings();

  return (
    <Form.Item
      name={name}
      label={name}
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
      <Checkbox style={{ width: '100%' }} disabled={editMode} />
    </Form.Item>
  );
};
