import { Modal } from 'antd-v5';
import { FC } from 'react';
import { AntdForm } from '../../../../../../../components';
import { Input, InputNumber } from '../../../../../../../components/Input';
import { useResetFormOnCloseModal } from '../../../hooks';
import { StyledFormItem } from '../../../../../../../features/databases/UploadDataModel/styles';

interface AddUploadFieldsFormModalProps {
  open: boolean;
  onCancel: () => void;
}

export const AddUploadFieldsFormModal: FC<AddUploadFieldsFormModalProps> = ({
  open,
  onCancel,
}) => {
  const [form] = AntdForm.useForm();

  useResetFormOnCloseModal({
    form,
    open,
  });

  const onOk = () => {
    form.submit();
  };

  return (
    <Modal title="Добавить поле" open={open} onOk={onOk} onCancel={onCancel}>
      <AntdForm form={form} layout="vertical" name="addUploadFieldsForm">
        <StyledFormItem
          name="name"
          label="User Name"
          rules={[{ required: true }]}
        >
          <Input />
        </StyledFormItem>
        <StyledFormItem
          name="age"
          label="User Age"
          rules={[{ required: true }]}
        >
          <InputNumber />
        </StyledFormItem>
      </AntdForm>
    </Modal>
  );
};
