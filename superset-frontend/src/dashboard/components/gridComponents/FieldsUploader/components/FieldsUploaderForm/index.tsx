import { FC, useCallback, useEffect } from 'react';
import { t } from '@superset-ui/core';
import { Form, Button } from 'antd';
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
    setUploadFieldsSettingsState,
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
    <>
      <Form
        form={form}
        name="fieldsUploaderForm"
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={component?.uploadInfo}
        data-test="dashboard-edit-properties-form"
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {editMode && (
            <DatabaseSettings clearSchemaFieldForm={clearSchemaFieldForm} />
          )}

          {editMode && (
            <Form.Item style={{ alignSelf: 'center' }}>
              <Button
                htmlType="button"
                onClick={() =>
                  setUploadFieldsSettingsState({
                    isOpen: true,
                    editFieldIndex: null,
                  })
                }
              >
                {t('Добавить поле')}
              </Button>
            </Form.Item>
          )}

          <UploadFields />

          {!editMode && (
            <Form.Item style={{ alignSelf: 'center' }}>
              <Button htmlType="submit" aria-label={t('Загрузить')}>
                {t('Загрузить')}
              </Button>
            </Form.Item>
          )}
        </div>
      </Form>

      <UploadFieldsSettings />
    </>
  );
};
