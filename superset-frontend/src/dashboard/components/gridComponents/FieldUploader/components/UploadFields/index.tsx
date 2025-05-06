import { Dispatch, FC, SetStateAction } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { UploaderComponentType, UploadFieldType } from '../../types';

interface UploadFieldsProps {
  component: UploaderComponentType;
  setFieldsState: Dispatch<SetStateAction<UploadFieldType>>;
  editMode: boolean;
}

export const UploadFields: FC<UploadFieldsProps> = ({
  component,
  setFieldsState,
  editMode,
}) => {
  const fields = component.uploadInfo.fields || {};

  const removeFieldFromComponent = (fieldName: string) => {
    const updatedFields = { ...fields };
    delete updatedFields[fieldName];
    setFieldsState(updatedFields);
  };

  const editFieldFromComponent = () => {
    // TODO: Implement edit modal
  };

  const uploadFields = Object.entries(fields).map(([name, { type }]) => ({
    name,
    type,
  }));

  return (
    <Form.Item
      label="Поля для загрузки"
      shouldUpdate={(prev, next) => prev.uploadFields !== next.uploadFields}
    >
      {() =>
        uploadFields.length ? (
          <Row gutter={[8, 8]}>
            {uploadFields.map(({ name, type }) => (
              <Col key={name}>
                <Space align="center">
                  <Form.Item
                    name={name}
                    label={`${name}${editMode ? ` (${type})` : ''}`}
                    initialValue=""
                  >
                    <Input placeholder="Значение" />
                  </Form.Item>
                  {editMode && (
                    <Space direction="vertical" size="small">
                      <EditOutlined onClick={editFieldFromComponent} />
                      <DeleteOutlined
                        onClick={() => removeFieldFromComponent(name)}
                      />
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
        )
      }
    </Form.Item>
  );
};
