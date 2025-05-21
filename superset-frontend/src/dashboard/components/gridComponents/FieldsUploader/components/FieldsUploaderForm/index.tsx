import { FC, useCallback, useEffect, useMemo, memo } from 'react';
import { Divider, Form, Typography } from 'antd';
import { t } from '@superset-ui/core';
import { UploadFields } from '../UploadFields';
import DatabaseSettings from '../DatabaseSettings';
import { HeaderSettings } from '../HeaderSettings';

import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';

const FieldsUploaderForm: FC = () => {
  const uploadFields = useUploadFields();
  const { database, schema, table, queryType } = useDataWarehouse();
  const updateUploadFields = useUpdateUploadFields();
  const { active, label } = useHeader();
  const { editMode } = useComponentInfo();
  const [form] = Form.useForm();

  const initialValues = useMemo(() => {
    const initialFields = {};
    uploadFields.forEach(field => {
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
  }, [database, schema, table, queryType, uploadFields, label]);

  const isDatabaseReady = database && queryType && table.length > 0;

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const resetUploadFields = useCallback(
    () =>
      updateUploadFields(uploadFields.map(field => ({ ...field, value: '' }))),
    [uploadFields, updateUploadFields],
  );

  const handleSubmit = useCallback(() => {
    console.log({ database, schema, table, queryType, uploadFields });
    // Здесь можно добавить логику отправки данных
    resetUploadFields();
  }, [database, uploadFields, queryType, resetUploadFields, schema, table]);

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
