import { FC, useCallback, useRef, useState, useMemo } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { throttle } from 'lodash';
import {
  useUploadInfo,
  useUploadInfoController,
} from '../../contexts/UploadInfoContext';

export const UploadFields: FC = () => {
  const { editMode } = useUploadInfo();
  const { fieldsState, setFieldsState, setUploadFieldsSettingsState } =
    useUploadInfoController();

  const resizingRef = useRef<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [tempWidth, setTempWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const throttledSetWidth = useMemo(
    () =>
      throttle((index: number, newWidth: number) => {
        setFieldsState(prev =>
          prev.map((field, i) =>
            i === index ? { ...field, width: newWidth } : field,
          ),
        );
      }, 100),
    [setFieldsState],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingRef.current) return;

      const { index, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(100, startWidth + delta);

      setTempWidth(newWidth);
      throttledSetWidth(index, newWidth);
    },
    [throttledSetWidth],
  );

  const stopResizing = useCallback(() => {
    if (resizingRef.current && tempWidth !== null) {
      setFieldsState(prev =>
        prev.map((field, i) =>
          i === resizingRef.current!.index
            ? { ...field, width: tempWidth }
            : field,
        ),
      );
    }

    resizingRef.current = null;
    setTempWidth(null);
    setIsResizing(false);

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [tempWidth, setFieldsState, handleMouseMove]);

  const startResizing = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      const inputWrapper = e.currentTarget.parentElement as HTMLElement;
      if (!inputWrapper) return;

      resizingRef.current = {
        index,
        startX: e.clientX,
        startWidth: inputWrapper.offsetWidth,
      };

      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResizing);
    },
    [handleMouseMove, stopResizing],
  );

  const removeField = useCallback(
    (index: number) => {
      setFieldsState(prev => prev.filter((_, i) => i !== index));
    },
    [setFieldsState],
  );

  const renderFields = useMemo(() => {
    if (!fieldsState.length) {
      return (
        <Typography.Text type="secondary">
          ( Ни одно поле не добавлено )
        </Typography.Text>
      );
    }

    return (
      <Row justify="center" gutter={[16, 8]}>
        {fieldsState.map(({ name, type, width }, index) => (
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
                      onMouseDown={startResizing(index)}
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
                  <EditOutlined
                    onClick={() =>
                      setUploadFieldsSettingsState({
                        isOpen: true,
                        editFieldIndex: index,
                      })
                    }
                  />
                  <DeleteOutlined onClick={() => removeField(index)} />
                </Space>
              )}
            </Space>
          </Col>
        ))}
      </Row>
    );
  }, [
    fieldsState,
    editMode,
    isResizing,
    removeField,
    setUploadFieldsSettingsState,
    startResizing,
  ]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <Typography.Title style={{ alignSelf: 'flex-start' }} level={5}>
        Поля для загрузки
      </Typography.Title>
      {renderFields}
    </div>
  );
};
