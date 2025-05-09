import { FC, useCallback } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useUploadInfoStateController } from '../../contexts/UploadInfoStateController';

export const UploadFields: FC = () => {
  const {
    editMode,
    fieldsState,
    setFieldsState,
    setUploadFieldsSettingsFormModalState,
  } = useUploadInfoStateController();

  const removeField = useCallback(
    (index: number) => {
      setFieldsState(prev =>
        prev.filter((_, prevIndex) => index !== prevIndex),
      );
    },
    [setFieldsState],
  );

  const renderFields = fieldsState.length ? (
    <Row gutter={[8, 8]}>
      {fieldsState.map(({ name, type }, index) => (
        <Col key={name}>
          <Space align="center">
            <Form.Item name={name} label={name}>
              <Input placeholder={type} disabled={editMode} />
            </Form.Item>
            {editMode && (
              <Space direction="vertical" size="small">
                <EditOutlined
                  onClick={() =>
                    setUploadFieldsSettingsFormModalState({
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
  ) : (
    <Typography.Text type="secondary">
      ( Ни одно поле не добавлено )
    </Typography.Text>
  );

  return (
    <Form.Item
      label="Поля для загрузки"
      shouldUpdate={(prev, next) => prev.field !== next.field}
    >
      {() => renderFields}
    </Form.Item>
  );
};
