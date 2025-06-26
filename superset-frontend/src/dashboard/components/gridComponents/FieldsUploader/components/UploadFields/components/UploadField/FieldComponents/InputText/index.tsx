import { Form, Input, Space, Tooltip } from 'antd-v5';
import { FC, useMemo } from 'react';
import { t } from '@superset-ui/core';
import { ColumnHeightOutlined } from '@ant-design/icons';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { validateType } from '../../../../../../validators';
import { BaseFieldProps, UploadFieldFormatType } from '../../../../../../types';
import { useDataWarehouse } from '../../../../../../contexts/DataWarehouseContext';
import { useColumnsSettings } from '../../../../../../contexts/ColumnsSettingsContext';

type InputTextProps = Required<
  Pick<
    BaseFieldProps,
    | 'type'
    | 'name'
    | 'tooltipContent'
    | 'isRequired'
    | 'hasCounter'
    | 'rowCount'
    | 'isMultiple'
    | 'isAutoSize'
  >
> &
  UploadFieldFormatType;

export const InputText: FC<InputTextProps> = ({
  name,
  tooltipContent,
  isRequired,
  type,
  size,
  hasCounter,
  isMultiple,
  isAutoSize,
  rowCount,
  enumValues,
  precision,
  scale,
}) => {
  const { editMode } = useComponentState();
  const { subd } = useDataWarehouse();
  const { dayFirst } = useColumnsSettings();

  const autoSizeTooltip = useMemo(
    () => `Поле автоматически растягивается по высоте до ${rowCount} строк`,
    [rowCount],
  );

  return (
    <Form.Item
      name={name}
      label={
        <Space size={4}>
          {t(name)}
          {isAutoSize && (
            <Tooltip title={t(autoSizeTooltip)}>
              <ColumnHeightOutlined />
            </Tooltip>
          )}
        </Space>
      }
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
              size,
              enumValues,
              precision,
              scale,
            })(_, value),
        },
      ]}
    >
      {isMultiple ? (
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
      ) : (
        <Input
          style={{ width: '100%' }}
          placeholder={type}
          disabled={editMode}
          count={{ show: hasCounter, max: size }}
          allowClear
        />
      )}
    </Form.Item>
  );
};
