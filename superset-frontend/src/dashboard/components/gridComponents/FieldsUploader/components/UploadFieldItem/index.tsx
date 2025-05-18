import { FC, memo, useCallback } from 'react';
import { Col, Form, Input, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { useComponentInfo } from '../../contexts/UploadInfoContext';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../util/constants';

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
        <Space size={5} align="center">
          <Form.Item label={name}>
            <ResizableContainer
              id={`upload-field-item-${index}`} // Исправлены кавычки
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
              <Input
                placeholder={type}
                disabled={editMode}
                style={{ width: '100%' }}
              />
            </ResizableContainer>
          </Form.Item>
          {editMode && (
            <Space direction="vertical" size={3}>
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
      </Col>
    );
  },
);

export default UploadFieldItem;
