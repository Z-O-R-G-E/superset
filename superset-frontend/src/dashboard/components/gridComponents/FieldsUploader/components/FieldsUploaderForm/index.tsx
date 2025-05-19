import { FC, useCallback, useEffect, useMemo, memo } from 'react';
import { Form } from 'antd';
import DatabaseSettings from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';
import {
  useComponentInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import { DatabaseHeader } from '../DatabaseHeader';

const FieldsUploaderForm: FC = memo(() => {
  const uploadInfo = useUploadInfo();
  const { editMode } = useComponentInfo();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(uploadInfo);
  }, [uploadInfo, form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      console.log('Submitting form with values:', values);
    } catch (error) {
      console.warn('Validation failed:', error);
    }
  }, [form]);

  const initialValues = useMemo(() => uploadInfo, [uploadInfo]);

  return (
    <Form
      form={form}
      name="fieldsUploaderForm"
      onFinish={handleSubmit}
      layout="vertical"
      initialValues={initialValues}
      data-test="dashboard-edit-properties-form"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {!editMode && <DatabaseHeader />}
        {editMode && <DatabaseSettings />}
        <UploadFields />
      </div>
    </Form>
  );
});

export default FieldsUploaderForm;
