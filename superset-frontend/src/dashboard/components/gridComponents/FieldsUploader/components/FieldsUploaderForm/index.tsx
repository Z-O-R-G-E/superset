import { FC, useCallback } from 'react';
import { Form } from 'antd';
import { DatabaseSettings } from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';
import { useComponentState } from '../../contexts/UploadInfoContext';

export const FieldsUploaderForm: FC = () => {
  const { component, editMode } = useComponentState();

  const [form] = Form.useForm();

  const clearSchemaFieldForm = useCallback(() => {
    form.setFieldsValue({ schema: undefined });
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      // TODO: вызов API с values
      console.log('Submitting form with values:', values);
    } catch (error) {
      console.warn('Validation failed:', error);
    }
  }, [form]);

  return (
    <Form
      form={form}
      name="fieldsUploaderForm"
      onFinish={handleSubmit}
      layout="vertical"
      initialValues={component?.uploadInfo}
      data-test="dashboard-edit-properties-form"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {editMode && (
          <DatabaseSettings clearSchemaFieldForm={clearSchemaFieldForm} />
        )}
        <UploadFields />
      </div>
    </Form>
  );
};
