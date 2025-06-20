import { FC, memo, useCallback, useMemo } from 'react';
import { Col, Form, Input, Space } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { useComponentInfo } from '../../../../contexts/ComponentInfoContext';
import { validateType } from '../../../../validators';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import {
  SubdType,
  UploadFieldConfigType,
  UploadFieldFormatType,
  UploadFieldLayoutType,
} from '../../../../types';
import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';
import { TYPE_DESCRIPTIONS } from '../../../../constants';

type UploadFieldProps = {
  index: number;
  subd: SubdType;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

const UploadField: FC<UploadFieldProps> = memo(
  ({ index, subd, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
    const { name, type, isRequired, isMultiple, description } = fieldConfig;
    const { size, enumValues, precision, scale } = formatOptions;
    const {
      isAutoSize,
      hasCounter,
      rowCount,
      width = GRID_MIN_COLUMN_COUNT,
    } = layoutOptions;
    const { removeField, onWidthChange } = useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentInfo();
    const { dayFirst } = useColumnsSettings();

    const defaultTypeDescription = useMemo(
      () => TYPE_DESCRIPTIONS[type],
      [type],
    );

    const normalizedWidth = useMemo(
      () => Math.min(Math.max(width, GRID_MIN_COLUMN_COUNT), widthMultiple - 1),
      [width, widthMultiple],
    );

    const handleResizeStart = useCallback(() => {
      setDisableDragDrop(true);
    }, [setDisableDragDrop]);

    const handleResizeStop = useCallback(
      ({ widthMultiple: newWidthRaw }: { widthMultiple: number }) => {
        const newWidth = Math.min(newWidthRaw, widthMultiple - 1);
        if (newWidth !== width) {
          onWidthChange(index, newWidth);
        }
        setDisableDragDrop(false);
      },
      [index, onWidthChange, setDisableDragDrop, widthMultiple, width],
    );

    const handleEdit = useCallback(() => onEdit(index), [onEdit, index]);
    const handleDelete = useCallback(
      () => removeField(index),
      [removeField, index],
    );

    return (
      <Col>
        <Space
          style={{ display: 'flex', alignItems: 'stretch' }}
          size={5}
          align="start"
        >
          <ResizableContainer
            id={`upload-field-item-${index}`}
            adjustableWidth
            adjustableHeight={false}
            widthStep={columnWidth}
            minWidthMultiple={GRID_MIN_COLUMN_COUNT}
            maxWidthMultiple={widthMultiple - 1}
            widthMultiple={normalizedWidth}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            editMode={editMode}
          >
            <Form.Item
              style={{ margin: 0 }}
              labelCol={{ style: { paddingBottom: 0 } }}
              wrapperCol={{ style: { paddingTop: 0 } }}
              name={name}
              label={t(name)}
              tooltip={
                editMode
                  ? t(
                      'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
                    )
                  : description?.toLowerCase() !== 'none' &&
                    t(
                      description?.length > 0
                        ? description
                        : defaultTypeDescription,
                    )
              }
              validateTrigger={['onChange', 'onBlur']}
              required={isRequired}
              rules={[
                {
                  required: !!isRequired,
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
                  autoSize={
                    isAutoSize
                      ? { minRows: 1, maxRows: rowCount }
                      : { minRows: rowCount, maxRows: rowCount }
                  }
                  style={{ width: '100%' }}
                  count={{
                    show: hasCounter,
                    max: size,
                  }}
                />
              ) : (
                <Input
                  placeholder={type}
                  allowClear
                  disabled={editMode}
                  style={{ width: '100%' }}
                  count={{
                    show: hasCounter,
                    max: size,
                  }}
                />
              )}
            </Form.Item>
          </ResizableContainer>
          {editMode && (
            <Space
              style={{ position: 'relative', top: '1em' }}
              direction="vertical"
              size={1}
            >
              <EditOutlined
                onClick={handleEdit}
                aria-label={t('Редактировать поле')}
              />
              <DeleteOutlined
                onClick={handleDelete}
                aria-label={t('Удалить поле')}
              />
            </Space>
          )}
        </Space>
      </Col>
    );
  },
);

export default UploadField;
