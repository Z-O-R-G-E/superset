import { FC, useCallback, useRef, memo } from 'react';
import { Col, Form, Input, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';

interface UploadFieldItemProps {
  index: number;
  name: string;
  type: string;
  width?: number;
  editMode: boolean;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onResize: (index: number, newWidth: number) => void;
  isFieldResizing: boolean;
  setIsFieldResizing: (value: boolean) => void;
}

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({
    index,
    name,
    type,
    width = 200,
    editMode,
    onRemove,
    onEdit,
    onResize,
    isFieldResizing,
    setIsFieldResizing,
  }) => {
    const resizingRef = useRef<{
      startX: number;
      startWidth: number;
    } | null>(null);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        const newWidth = Math.max(100, resizingRef.current.startWidth + delta);
        onResize(index, newWidth);
      },
      [index, onResize],
    );

    const stopResizing = useCallback(() => {
      resizingRef.current = null;
      setIsFieldResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    }, [handleMouseMove, setIsFieldResizing]);

    const startResizing = useCallback(
      (e: React.MouseEvent) => {
        const inputWrapper = e.currentTarget.parentElement;
        if (!inputWrapper) return;

        resizingRef.current = {
          startX: e.clientX,
          startWidth: inputWrapper.clientWidth,
        };

        setIsFieldResizing(true);
        e.preventDefault();
        e.stopPropagation();

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
      },
      [handleMouseMove, stopResizing, setIsFieldResizing],
    );

    return (
      <Col key={`${name}-${index}`}>
        <Space size={5} align="center">
          <Form.Item label={name}>
            <div
              style={{
                position: 'relative',
                width: `${width}px`,
                minWidth: '100px',
              }}
            >
              <Input
                placeholder={type}
                disabled={editMode && !isFieldResizing}
                style={{ width: '100%' }}
              />
              {editMode && (
                <div
                  onMouseDown={startResizing}
                  role="presentation"
                  style={{
                    width: '6px',
                    height: '100%',
                    cursor: 'col-resize',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    zIndex: 1,
                  }}
                />
              )}
            </div>
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
