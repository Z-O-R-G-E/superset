import { FC, useCallback, useRef, useState, useMemo } from 'react';
import { Col, Form, Input, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { throttle } from 'lodash';

type Props = {
  index: number;
  name: string;
  type: string;
  width?: number;
  editMode: boolean;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onResize: (index: number, newWidth: number) => void;
};

export const UploadFieldItem: FC<Props> = ({
  index,
  name,
  type,
  width,
  editMode,
  onRemove,
  onEdit,
  onResize,
}) => {
  const resizingRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const [isResizing, setIsResizing] = useState(false);

  const throttledResize = useMemo(
    () =>
      throttle((newWidth: number) => {
        onResize(index, newWidth);
      }, 100),
    [index, onResize],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(100, resizingRef.current.startWidth + delta);
      throttledResize(newWidth);
    },
    [throttledResize],
  );

  const stopResizing = useCallback(() => {
    resizingRef.current = null;
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      const inputWrapper = e.currentTarget.parentElement as HTMLElement;
      if (!inputWrapper) return;

      resizingRef.current = {
        startX: e.clientX,
        startWidth: inputWrapper.offsetWidth,
      };

      setIsResizing(true);
      e.preventDefault();
      e.stopPropagation();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResizing);
    },
    [handleMouseMove, stopResizing],
  );

  return (
    <Col key={`${name}-${index}`}>
      <Space size={5} align="center">
        <Form.Item name={name} label={name}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              width: width ? `${width}px` : '200px',
              minWidth: 100,
            }}
          >
            <Input
              placeholder={type}
              disabled={editMode && !isResizing}
              style={{ width: '100%' }}
            />
            {editMode && (
              <div
                onMouseDown={startResizing}
                role="presentation"
                style={{
                  width: 6,
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
            <EditOutlined onClick={() => onEdit(index)} />
            <DeleteOutlined onClick={() => onRemove(index)} />
          </Space>
        )}
      </Space>
    </Col>
  );
};
