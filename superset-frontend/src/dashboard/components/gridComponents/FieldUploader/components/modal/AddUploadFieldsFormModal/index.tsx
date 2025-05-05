import { FC } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal } from 'antd';
import { UploadFieldType } from '../../../types';

interface AddUploadFieldsFormModalProps {
  open: boolean;
  fields: UploadFieldType;
  onCancel: () => void;
}

const FieldTypeOptions = [
  {
    value: 'INT',
    label: 'INT',
  },
  {
    value: 'STRING',
    label: 'STRING',
  },
  {
    value: 'FLOAT',
    label: 'FLOAT',
  },
];

export const AddUploadFieldsFormModal: FC<AddUploadFieldsFormModalProps> = ({
  open,
  fields,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const clearModal = () => {
    form.resetFields();
  };

  const onClose = () => {
    clearModal();
    onCancel();
  };

  const onFinish = () => {
    onClose();
  };

  const validateColumnName = (_: any, value: string) => {
    console.log(fields);

    if (!value) {
      return Promise.reject(t('Наименование поля обязательно'));
    }
    if (fields?.hasOwnProperty(value)) {
      return Promise.reject(t('Наименование поля уже существует'));
    }

    return Promise.resolve();
  };

  return (
    <Modal
      title="Добавить поле"
      cancelText="Отмена"
      okText="Подтвердить"
      onOk={form.submit}
      onCancel={onClose}
      data-test="add-upload-fields-modal"
      visible={open}
      centered
    >
      <Form
        onFinish={onFinish}
        form={form}
        layout="vertical"
        name="addUploadFieldsForm"
      >
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item
              name="type"
              label="Тип поля"
              rules={[
                {
                  required: true,
                  message: 'Тип поля обязателен',
                },
              ]}
            >
              <Select
                options={FieldTypeOptions}
                placeholder={t('Выберите тип поля')}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="name"
              required
              label="Наименование поля"
              rules={[{ validator: validateColumnName }]}
            >
              <Input allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
