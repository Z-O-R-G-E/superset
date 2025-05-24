import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Divider, Form, Row, Typography } from 'antd';
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
  const { uploadFields, resetUploadFields } = useUploadFieldsManagement();

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
    if (editMode) {
      form.resetFields();
    }
  }, [initialValues, form, editMode]);

  const handleSubmit = useCallback(() => {
    const fieldsValues = uploadFields.map(field => ({
      ...field,
      value: form.getFieldValue(field.name),
    }));

    console.log({ database, schema, table, queryType, fieldsValues });
    resetUploadFields();
  }, [
    uploadFields,
    database,
    schema,
    table,
    queryType,
    resetUploadFields,
    form,
  ]);

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
          <Row style={{ width: '100%' }}>
            <Col
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                htmlType="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: '3rem',
                }}
                onClick={handleAddField}
              >
                <span
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t('Добавить поле')}
                </span>
              </Button>
            </Col>
          </Row>
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
                size={field.size}
                setEnum={field.setEnum}
                precision={field.precision}
                scale={field.scale}
                width={field.width}
                onEdit={handleEditField}
              />
            ))}
          </Row>
        )}

        {!editMode && uploadFields.length > 0 && (
          <Row style={{ width: '100%' }}>
            <Col
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                htmlType="submit"
                aria-label={t('Загрузить')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: '3rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t('Загрузить')}
                </span>
              </Button>
            </Col>
          </Row>
        )}

        <UploadFieldsSettings
          uploadFieldsSettingsState={settingsState}
          setUploadFieldsSettingsState={setSettingsState}
        />
      </div>
    </Form>
  );
};
