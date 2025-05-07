import { Dispatch, FC, SetStateAction, useCallback } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { UploadFieldType } from '../../types';

interface UploadFieldsProps {
  fieldsState: UploadFieldType[];
  setFieldsState: Dispatch<SetStateAction<UploadFieldType[]>>;
  toggleUploadFieldsSettingsFormModal: (
    isOpen: boolean,
    isEditMode: boolean,
  ) => void;
  editMode: boolean;
}

export const UploadFields: FC<UploadFieldsProps> = ({
  toggleUploadFieldsSettingsFormModal,
  setFieldsState,
  fieldsState,
  editMode,
}) => {
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
            <Form.Item name={name} label={name} initialValue="">
              <Input placeholder={type} disabled={editMode} />
            </Form.Item>
            {editMode && (
              <Space direction="vertical" size="small">
                <EditOutlined
                  onClick={() =>
                    toggleUploadFieldsSettingsFormModal(true, true)
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
