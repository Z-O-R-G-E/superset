import { FC, memo, useCallback } from 'react';
import { Col, Form, Input, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { useComponentInfo } from '../../contexts/UploadInfoContext';

interface UploadFieldItemProps {
  index: number;
  name: string;
  type: string;
  width?: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onWidthChange: (index: number, newWidth: number) => void;
}

const WIDTH_STEP = 1;
const MIN_WIDTH_MULTIPLE = 5;

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({ index, name, type, width = 10, onRemove, onEdit, onWidthChange }) => {
    const { setDisableDragDrop, editMode } = useComponentInfo();

    const handleResizeStart = useCallback(() => {
      setDisableDragDrop(true);
    }, [setDisableDragDrop]);

    const handleResizeStop = useCallback(
      event => {
        onWidthChange(index, event.widthMultiple);
        setDisableDragDrop(false);
      },
      [index, onWidthChange, setDisableDragDrop],
    );

    return (
      <Col key={name}>
        <Space size={5} align="center">
          <Form.Item label={name}>
            <ResizableContainer
              id={`upload-field-item-${index}`}
              adjustableWidth
              adjustableHeight={false}
              widthStep={WIDTH_STEP}
              minWidthMultiple={MIN_WIDTH_MULTIPLE}
              widthMultiple={width}
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
