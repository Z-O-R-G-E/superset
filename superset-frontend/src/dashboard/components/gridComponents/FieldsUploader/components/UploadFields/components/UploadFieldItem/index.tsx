import { FC, memo, useCallback, useMemo } from 'react';
import { Col, Form, Input, Space } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { useComponentInfo } from '../../../../contexts/ComponentInfoContext';
import { validateType } from '../../../../validators';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import { SubdType, UploadFieldType } from '../../../../types';
import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';
import { SIZE_DEPENDENT_TYPES, TYPE_DESCRIPTIONS } from '../../../../constants';

type UploadFieldItemProps = Omit<UploadFieldType, 'value'> & {
  index: number;
  subd: SubdType;
  onEdit: (index: number) => void;
};

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({
    index,
    name,
    type,
    isRequired,
    isMultiple,
    isAutoSize,
    rowCount,
    size,
    enumValues,
    subd,
    description,
    precision,
    scale,
    width = GRID_MIN_COLUMN_COUNT,
    onEdit,
  }) => {
    const { removeField, onWidthChange } = useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentInfo();
    const { dayFirst } = useColumnsSettings();

    const isSizeDependendType = useMemo(
      () => SIZE_DEPENDENT_TYPES.includes(type),
      [type],
    );

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
        <Space size={5} align="center">
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
                    show: isSizeDependendType,
                    max: size,
                  }}
                />
              ) : (
                <Input
                  placeholder={type}
                  allowClear
                  disabled={editMode}
                  style={{ width: '100%' }}
                />
              )}
            </Form.Item>
          </ResizableContainer>
          {editMode && (
            <Space direction="vertical" size={1}>
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

export default UploadFieldItem;
