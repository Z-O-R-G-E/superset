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
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../../../contexts/UploadFieldsContext';
import { validateType } from '../../../../utils/validators/validateType';

interface UploadFieldItemProps {
  index: number;
  name: string;
  type: string;
  width?: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onWidthChange: (index: number, newWidth: number) => void;
}

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({
    index,
    name,
    type,
    width = GRID_MIN_COLUMN_COUNT,
    onRemove,
    onEdit,
    onWidthChange,
  }) => {
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentInfo();

    const uploadFields = useUploadFields();
    const updateUploadFields = useUpdateUploadFields();

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

    const handleFieldChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateUploadFields(
          uploadFields.map(field =>
            field.name === name
              ? {
                  ...field,
                  value: e.target.value,
                }
              : field,
          ),
        );
      },
      [uploadFields, name, updateUploadFields],
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
                    validator: (_, value) => validateType(type)(_, value),
                  },
                ]}
              >
                <Input
                  placeholder={type}
                  disabled={editMode}
                  onChange={handleFieldChange}
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
                  onClick={() => onRemove(index)}
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
