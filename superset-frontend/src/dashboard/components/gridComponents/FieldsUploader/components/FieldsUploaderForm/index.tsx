import { FC, useCallback, useEffect } from 'react';
import { Form } from 'antd';
import { UploadFieldsSettings } from '../../modal';
import { DatabaseSettings } from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';
import {
  useUploadInfo,
  useUploadInfoController,
} from '../../contexts/UploadInfoContext';

export const FieldsUploaderForm: FC = () => {
  const { component, editMode } = useUploadInfo();

  const {
    databaseState,
    schemaState,
    tableState,
    fieldsState,
    updateUploadInfo,
  } = useUploadInfoController();

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

  useEffect(() => {
    updateUploadInfo('database', databaseState);
    updateUploadInfo('schema', schemaState);
    updateUploadInfo('table', tableState);
    updateUploadInfo('fields', fieldsState);
  }, [databaseState, schemaState, tableState, fieldsState, updateUploadInfo]);

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
