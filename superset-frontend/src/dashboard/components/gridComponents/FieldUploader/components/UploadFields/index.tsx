import { Dispatch, FC, SetStateAction, useCallback, useMemo } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { UploadFieldType } from '../../types';
import { useComponentState } from '../../contexts/ComponentContext';

interface UploadFieldsProps {
  setFieldsState: Dispatch<SetStateAction<UploadFieldType>>;
  toggleUploadFieldsSettingsFormModal: (
    isOpen: boolean,
    isEditMode: boolean,
  ) => void;
}

export const UploadFields: FC<UploadFieldsProps> = ({
  toggleUploadFieldsSettingsFormModal,
  setFieldsState,
}) => {
  const { component, editMode } = useComponentState();
  const fields = useMemo(
    () => component.uploadInfo.fields || {},
    [component.uploadInfo.fields],
  );

  const removeField = useCallback(
    (fieldName: string) => {
      const updatedFields = { ...fields };
      delete updatedFields[fieldName];
      setFieldsState(updatedFields);
    },
    [fields, setFieldsState],
  );

  const uploadFields = useMemo(
    () =>
      Object.entries(fields).map(([name, { type }]) => ({
        name,
        type,
      })),
    [fields],
  );

  const renderFields = uploadFields.length ? (
    <Row gutter={[8, 8]}>
      {uploadFields.map(({ name, type }) => (
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
                <DeleteOutlined onClick={() => removeField(name)} />
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
      shouldUpdate={(prev, next) => prev.uploadFields !== next.uploadFields}
    >
      {() => renderFields}
    </Form.Item>
  );
};
