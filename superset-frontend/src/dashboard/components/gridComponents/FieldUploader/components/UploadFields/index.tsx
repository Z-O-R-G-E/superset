import { Dispatch, FC, SetStateAction } from 'react';
import { Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { UploaderComponentType, UploadFieldType } from '../../types';

interface UploadFieldsProps {
  component: UploaderComponentType;
  setFieldsState: Dispatch<SetStateAction<UploadFieldType | undefined>>;
  editMode: boolean;
}

export const UploadFields: FC<UploadFieldsProps> = ({
  component,
  setFieldsState,
  editMode,
}) => {
  const removeFieldFromComponent = (fieldName: string) => {
    const componentFields = component.uploadInfo.fields;
    delete componentFields[fieldName];
    setFieldsState({ ...componentFields });
  };

  const editFieldFromComponent = () => {
    // TODO
  };

  const getFieldsFromComponent = () => {
    const componentFields = component.uploadInfo.fields;
    const fields: {
      type: string;
      name: string;
    }[] = [];
    if (!componentFields) return fields;
    for (const [key, value] of Object.entries(componentFields)) {
      fields.push({
        type: value.type,
        name: key,
      });
    }
    return fields;
  };

  return (
    <>
      <Form.Item name="uploadFields" noStyle />
      <Form.Item
        label="Поля для загрузки"
        shouldUpdate={(prevValues, curValues) =>
          prevValues.uploadFields !== curValues.uploadFields
        }
      >
        {() => {
          const uploadFields = getFieldsFromComponent();
          return uploadFields.length ? (
            <Row gutter={[8, 8]}>
              {uploadFields.map(({ name, type }) => (
                <Col key={name}>
                  <Space align="center">
                    <Form.Item
                      name={name}
                      label={`${name}${editMode ? `(${type})` : ''}`}
                    >
                      <Input />
                    </Form.Item>
                    {editMode && (
                      <Space direction="vertical" size="small">
                        <EditOutlined
                          onClick={() => {
                            editFieldFromComponent();
                          }}
                        />
                        <DeleteOutlined
                          onClick={() => {
                            removeFieldFromComponent(name);
                          }}
                        />
                      </Space>
                    )}
                  </Space>
                </Col>
              ))}
            </Row>
          ) : (
            <Typography.Text className="ant-form-text" type="secondary">
              ( Ниодно поле не добавлено. )
            </Typography.Text>
          );
        }}
      </Form.Item>
    </>
  );
};
