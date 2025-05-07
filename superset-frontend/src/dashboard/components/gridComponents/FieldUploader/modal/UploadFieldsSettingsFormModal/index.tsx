import { FC } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal } from 'antd';
import { lowerCase } from 'lodash';
import { UploadFieldType } from '../../types';

interface UploadFieldsSettingsFormModalProps {
  uploadFieldsSettingsFormModalState: { isOpen: boolean; isEditMode: boolean };
  fields: UploadFieldType;
  onCancel: () => void;
}

const FieldTypeOptions = [
  { value: 'INT', label: 'INT' },
  { value: 'STRING', label: 'STRING' },
  { value: 'FLOAT', label: 'FLOAT' },
];

export const UploadFieldsSettingsFormModal: FC<
  UploadFieldsSettingsFormModalProps
> = ({ uploadFieldsSettingsFormModalState, fields, onCancel }) => {
  const [form] = Form.useForm();
  const { isOpen, isEditMode } = uploadFieldsSettingsFormModalState;
  const onClose = () => {
    form.resetFields();
    onCancel();
  };

  const validateColumnName = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('Наименование поля обязательно'));
    if (isEditMode) return Promise.resolve();
    if (fields?.hasOwnProperty(lowerCase(value))) {
      return Promise.reject(t('Наименование поля уже существует'));
    }
    return Promise.resolve();
  };

  return (
    <Modal
      title={t('Добавить поле')}
      visible={isOpen}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      onOk={form.submit}
      onCancel={onClose}
      centered
      data-test="add-upload-fields-modal"
    >
      <Form
        name="addUploadFieldsForm"
        layout="vertical"
        form={form}
        onFinish={onClose}
      >
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item
              name="type"
              initialValue=""
              label={t('Тип поля')}
              rules={[{ required: true, message: t('Тип поля обязателен') }]}
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
              initialValue=""
              label={t('Наименование поля')}
              rules={[{ validator: validateColumnName }]}
              required
            >
              <Input allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
