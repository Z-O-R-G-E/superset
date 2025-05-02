import { FC } from 'react';
import { t } from '@superset-ui/core';
import { AntdForm, Col, Row, Select } from '../../../../../../../components';
import { Input } from '../../../../../../../components/Input';
import Modal from '../../../../../../../components/Modal';
import { addSuccessToast } from '../../../../../../../components/MessageToasts/actions';

interface AddUploadFieldsFormModalProps {
  open: boolean;
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
  onCancel,
}) => {
  const [form] = AntdForm.useForm();

  const clearModal = () => {
    form.resetFields();
  };

  const onClose = () => {
    clearModal();
    onCancel();
  };

  const onFinish = () => {
    addSuccessToast(t('Поле добавлено'));
    onClose();
  };

  return (
    <Modal
      name="addUploadFields"
      data-test="add-upload-fields-modal"
      onHandledPrimaryAction={form.submit}
      onHide={onClose}
      primaryButtonName="Принять"
      centered
      show={open}
      title="Добавить поле"
    >
      <AntdForm
        onFinish={onFinish}
        form={form}
        layout="vertical"
        name="addUploadFieldsForm"
      >
        <Row gutter={8}>
          <Col span={8}>
            <AntdForm.Item
              name="fieldType"
              label="Тип поля"
              rules={[
                {
                  required: true,
                  message: 'Тип поля обязателен',
                },
              ]}
            >
              <Select
                ariaLabel={t('Выберите тип поля')}
                options={FieldTypeOptions}
                placeholder={t('Выберите тип поля')}
                allowNewOptions
              />
            </AntdForm.Item>
          </Col>
          <Col span={16}>
            <AntdForm.Item
              name="fieldName"
              label="Наименование поля"
              rules={[
                {
                  required: true,
                  message: 'Наименование поля обязательно',
                },
              ]}
            >
              <Input />
            </AntdForm.Item>
          </Col>
        </Row>
      </AntdForm>
    </Modal>
  );
};
