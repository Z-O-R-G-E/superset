import { FC } from 'react';
import { t } from '@superset-ui/core';
import { AntdForm } from '../../../../../../../components';
import { Input, InputNumber } from '../../../../../../../components/Input';
import Modal from '../../../../../../../components/Modal';
import { addSuccessToast } from '../../../../../../../components/MessageToasts/actions';

interface AddUploadFieldsFormModalProps {
  open: boolean;
  onCancel: () => void;
}

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
        <AntdForm.Item
          name="name"
          label="User Name"
          rules={[{ required: true }]}
        >
          <Input />
        </AntdForm.Item>
        <AntdForm.Item name="age" label="User Age" rules={[{ required: true }]}>
          <InputNumber />
        </AntdForm.Item>
      </AntdForm>
    </Modal>
  );
};
