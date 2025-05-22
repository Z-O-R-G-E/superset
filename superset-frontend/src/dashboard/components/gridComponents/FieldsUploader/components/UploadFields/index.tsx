import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Divider, Form, Row, Typography } from 'antd';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useUploadFieldsManagement } from './hooks/useUploadFieldsManagement';
import UploadFieldItem from './components/UploadFieldItem';

export const UploadFields: FC = () => {
  const [form] = Form.useForm();
  const [settingsState, setSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const { database, schema, table, queryType } = useDataWarehouse();
  const { editMode } = useComponentInfo();
  const { uploadFields, removeField, onWidthChange, resetUploadFields } =
    useUploadFieldsManagement();

  const initialValues = useMemo(() => {
    const initialFields = {};
    uploadFields.forEach(field => {
      initialFields[field.name] = field.value;
    });

    return {
      ...initialFields,
    };
  }, [uploadFields]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const handleSubmit = useCallback(() => {
    console.log({ database, schema, table, queryType, uploadFields });
    resetUploadFields();
  }, [database, schema, table, queryType, uploadFields, resetUploadFields]);

  const handleAddField = useCallback(
    () => setSettingsState({ isOpen: true, editFieldIndex: null }),
    [],
  );

  const handleEditField = useCallback(
    (index: number) =>
      setSettingsState({ isOpen: true, editFieldIndex: index }),
    [],
  );

  const containerStyle = useMemo(
    () => ({
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.5rem',
      justifyContent: 'flex-start',
      alignItems: 'center',
    }),
    [],
  );

  return (
    <Form
      form={form}
      name="fieldsUploaderForm"
      layout="vertical"
      style={{ height: '100%' }}
      onFinish={handleSubmit}
      data-test="dashboard-edit-properties-form"
    >
      <div style={containerStyle}>
        {editMode && (
          <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            <Divider style={{ margin: 0 }} orientation="left">
              {t('Поля для загрузки')}
            </Divider>
          </div>
        )}

        {editMode && (
          <Form.Item style={{ margin: 0, alignSelf: 'center' }}>
            <Button htmlType="button" onClick={handleAddField}>
              {t('Добавить поле')}
            </Button>
          </Form.Item>
        )}

        {!uploadFields.length ? (
          <Typography.Text type="secondary">
            {editMode
              ? t('( Ни одно поле не добавлено. )')
              : t(
                  '( Ни одно поле не добавлено. Для добавления полей перейдите в режим редактирования дэшборда. )',
                )}
          </Typography.Text>
        ) : (
          <Row justify="center" gutter={[16, 8]} style={{ marginBottom: 16 }}>
            {uploadFields.map((field, index) => (
              <UploadFieldItem
                key={`${field.name}-${index}`}
                index={index}
                name={field.name}
                type={field.type}
                width={field.width}
                onRemove={removeField}
                onEdit={handleEditField}
                onWidthChange={onWidthChange}
              />
            ))}
          </Row>
        )}

        {!editMode && uploadFields.length > 0 && (
          <Form.Item style={{ alignSelf: 'center' }}>
            <Button htmlType="submit" aria-label={t('Загрузить')}>
              {t('Загрузить')}
            </Button>
          </Form.Item>
        )}

        <UploadFieldsSettings
          uploadFieldsSettingsState={settingsState}
          setUploadFieldsSettingsState={setSettingsState}
        />
      </div>
    </Form>
  );
};
