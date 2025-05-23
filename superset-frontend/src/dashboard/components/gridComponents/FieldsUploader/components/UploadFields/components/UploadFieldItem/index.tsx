import { FC, memo, useCallback } from 'react';
import { Col, Form, Input, Space, Tooltip } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { useComponentInfo } from '../../../../contexts/ComponentInfoContext';
import { validateType } from '../../../../utils/validators/validateType';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import { UploadFieldType } from '../../../../types';

type UploadFieldItemProps = Omit<UploadFieldType, 'value'> & {
  index: number;
  onEdit: (index: number) => void;
};

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({
    index,
    name,
    type,
    size,
    setEnum,
    precision,
    scale,
    width = GRID_MIN_COLUMN_COUNT,
    onEdit,
  }) => {
    const { removeField, onWidthChange } = useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentInfo();

    const normalizedWidth = Math.min(
      Math.max(width, GRID_MIN_COLUMN_COUNT),
      widthMultiple - 1,
    );

    const handleResizeStart = useCallback(() => {
      setDisableDragDrop(true);
    }, [setDisableDragDrop]);

    const handleResizeStop = useCallback(
      (event: { widthMultiple: number }) => {
        const newWidth = Math.min(event.widthMultiple, widthMultiple - 1);
        onWidthChange(index, newWidth);
        setDisableDragDrop(false);
      },
      [index, onWidthChange, setDisableDragDrop, widthMultiple],
    );

    return (
      <Col>
        <Space direction="vertical" size={1} style={{ display: 'flex' }}>
          <span>
            {t(name)}
            {editMode && (
              <Tooltip
                title={t(
                  'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
                )}
              >
                <InfoCircleOutlined style={{ marginLeft: 8 }} />
              </Tooltip>
            )}
          </span>
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
                label={null}
                style={{ margin: 0, padding: 0 }}
                validateTrigger={['onChange', 'onBlur']}
                rules={[
                  {
                    validator: (_, value) =>
                      validateType(type, { size, setEnum, precision, scale })(
                        _,
                        value,
                      ),
                  },
                ]}
              >
                <Input
                  placeholder={type}
                  disabled={editMode}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </ResizableContainer>
            {editMode && (
              <Space direction="vertical" size={1}>
                <EditOutlined
                  onClick={() => onEdit(index)}
                  aria-label={t('Редактировать поле')}
                />
                <DeleteOutlined
                  onClick={() => removeField(index)}
                  aria-label={t('Удалить поле')}
                />
              </Space>
            )}
          </Space>
        </Space>
      </Col>
    );
  },
);

export default UploadFieldItem;
