import { Form, Input } from 'antd-v5';
import { t } from '@superset-ui/core';
import { FC } from 'react';
import { InputType } from '../../../../../../types';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';

type InputTextAreaProps = InputType & {
  type: string;
  isAutoSize: boolean;
  hasCounter: boolean;
  size?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  rowCount: number;
};

export const InputTextArea: FC<InputTextAreaProps> = ({
  type,
  isAutoSize,
  hasCounter,
  size,
  rowCount,
  isRequired,
  name,
  precision,
  scale,
  enumValues,
  tooltipContent,
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
      <Input.TextArea
        placeholder={type}
        allowClear
        disabled={editMode}
        style={{ width: '100%' }}
        count={hasCounter ? { show: true, max: size } : undefined}
        autoSize={
          isAutoSize
            ? { minRows: 1, maxRows: rowCount }
            : { minRows: rowCount, maxRows: rowCount }
        }
      />
    </Form.Item>
  );
};
