import { FC, useCallback, useEffect, useMemo, memo } from 'react';
import { Divider, Form, Typography } from 'antd';
import { t } from '@superset-ui/core';
import { UploadFields } from '../UploadFields';
import DatabaseSettings from '../DatabaseSettings';
import { HeaderSettings } from '../HeaderSettings';
import {
  useUpdateUploadInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';

const FieldsUploaderForm: FC = () => {
  const { database, schema, table, queryType, fields } = useUploadInfo();
  const updateUploadInfo = useUpdateUploadInfo();
  const { active, label } = useHeader();
  const { editMode } = useComponentInfo();
  const [form] = Form.useForm();

  const initialValues = useMemo(() => {
    const initialFields = {};
    fields.forEach(field => {
      initialFields[field.name] = field.value;
    });

    return {
      database,
      schema,
      table,
      queryType,
      ...initialFields,
      label,
    };
  }, [database, schema, table, queryType, fields, label]);

  const isDatabaseReady = database && queryType && table.length > 0;

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const resetUploadFields = useCallback(
    () =>
      updateUploadInfo(
        'fields',
        fields.map(field => ({ ...field, value: '' })),
      ),
    [fields, updateUploadInfo],
  );

  const handleSubmit = useCallback(() => {
    console.log({ database, schema, table, queryType, fields });
    // Здесь можно добавить логику отправки данных
    resetUploadFields();
  }, [database, fields, queryType, resetUploadFields, schema, table]);

  return (
    <>
      {!editMode && active && (
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
