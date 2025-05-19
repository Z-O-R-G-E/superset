import { FC, useCallback, useEffect, memo } from 'react';
import { Form, Typography } from 'antd';
import { t } from '@superset-ui/core';
import DatabaseSettings from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';
import {
  useComponentInfo,
  useHeader,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import { Header } from '../Header';

const FieldsUploaderForm: FC = memo(() => {
  const uploadInfo = useUploadInfo();
  const { label } = useHeader();
  const { editMode } = useComponentInfo();
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({ ...uploadInfo, label });
  }, [uploadInfo, form, label]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
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
      initialValues={uploadInfo}
      data-test="dashboard-edit-properties-form"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Header />
        {editMode || (uploadInfo.database && uploadInfo.table.length > 0) ? (
          <>
            {editMode && <DatabaseSettings />}
            <UploadFields />
          </>
        ) : (
          <Typography.Text style={{ alignSelf: 'center' }} type="secondary">
            {t(
              '( Хранилище данных не настроено. Для настройки перейдите в режим редактирования дэшборда. )',
            )}
          </Typography.Text>
        )}
      </div>
    </Form>
  );
});

export default FieldsUploaderForm;
