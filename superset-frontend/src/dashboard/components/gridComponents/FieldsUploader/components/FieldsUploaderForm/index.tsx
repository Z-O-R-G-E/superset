import { FC, useCallback, useEffect, useMemo, memo } from 'react';
import { Divider, Form, Typography } from 'antd';
import { t } from '@superset-ui/core';
import { UploadFields } from '../UploadFields';
import DatabaseSettings from '../DatabaseSettings';
import { HeaderSettings } from '../HeaderSettings';
import { useUploadInfo } from '../../contexts/UploadInfoContext';
import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';

const FieldsUploaderForm: FC = () => {
  const uploadInfo = useUploadInfo();
  const { label } = useHeader();
  const { editMode } = useComponentInfo();
  const [form] = Form.useForm();

  const initialValues = useMemo(
    () => ({ ...uploadInfo, label }),
    [uploadInfo, label],
  );

  const isDatabaseReady = uploadInfo.database && uploadInfo.table.length > 0;

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      console.log('Submitting form with values:', values);
    } catch (error) {
      console.warn('Validation failed:', error);
    }
  }, [form]);

  return (
    <>
      {!editMode && (
        <Divider style={{ margin: 0 }} orientation="left">
          {label}
        </Divider>
      )}
      <Form
        form={form}
        name="fieldsUploaderForm"
        layout="vertical"
        style={{ height: '100%' }}
        onFinish={handleSubmit}
        initialValues={initialValues}
        data-test="dashboard-edit-properties-form"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden auto',
            gap: '0.5rem',
          }}
        >
          {editMode || isDatabaseReady ? (
            <>
              {editMode && <HeaderSettings />}
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
    </>
  );
};

export default memo(FieldsUploaderForm);
