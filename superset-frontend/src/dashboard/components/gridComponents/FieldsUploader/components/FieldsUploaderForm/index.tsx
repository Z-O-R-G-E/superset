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

  const clearSchemaFieldForm = () => form.setFieldsValue({ schema: undefined });

  const handleSubmit = useCallback(() => {
    // TODO вызов API на запись в БД
  }, []);

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

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
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
                  Добавить поле
                </Button>
              </Form.Item>
            )}
            <UploadFields />
          </div>

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
