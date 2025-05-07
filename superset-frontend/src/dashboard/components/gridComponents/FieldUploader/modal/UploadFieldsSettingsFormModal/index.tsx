import { FC, useCallback } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal } from 'antd';
import { lowerCase } from 'lodash';
import { AddFieldType, UploadFieldType } from '../../types';

interface UploadFieldsSettingsFormModalProps {
  uploadFieldsSettingsFormModalState: { isOpen: boolean; isEditMode: boolean };
  onChangeFields: (field: AddFieldType) => void;
  fields: UploadFieldType;
  toggleUploadFieldsSettingsFormModal: (
    isOpen: boolean,
    isEditMode: boolean,
  ) => void;
}

const FieldTypeOptions = [
  { value: 'INT', label: 'INT' },
  { value: 'STRING', label: 'STRING' },
  { value: 'FLOAT', label: 'FLOAT' },
];

export const UploadFieldsSettingsFormModal: FC<
  UploadFieldsSettingsFormModalProps
> = ({
  uploadFieldsSettingsFormModalState,
  onChangeFields,
  fields,
  toggleUploadFieldsSettingsFormModal,
}) => {
  const [form] = Form.useForm();
  const { isOpen, isEditMode } = uploadFieldsSettingsFormModalState;

  const onClose = useCallback(() => {
    form.resetFields();
    toggleUploadFieldsSettingsFormModal(false, false);
  }, [form, toggleUploadFieldsSettingsFormModal]);

  const validateColumnName = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('Наименование поля обязательно'));
    if (isEditMode) return Promise.resolve();
    if (fields?.hasOwnProperty(lowerCase(value))) {
      return Promise.reject(t('Наименование поля уже существует'));
    }
    return Promise.resolve();
  };

  const handleSubmit = useCallback(
    values => {
      onChangeFields({ ...values, name: lowerCase(values.name) });
      onClose();
    },
    [onChangeFields, onClose],
  );

  return (
    <Modal
      title={t('Добавить поле')}
      visible={isOpen}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      okButtonProps={{ autoFocus: true, htmlType: 'submit' }}
      onCancel={onClose}
      centered
      destroyOnClose
      data-test="upload-fields-settings-modal"
      modalRender={dom => (
        <Form
          name="uploadFieldsSettingsForm"
          layout="vertical"
          form={form}
          onFinish={values => handleSubmit(values)}
        >
          {dom}
        </Form>
      )}
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
    </Modal>
  );
};
