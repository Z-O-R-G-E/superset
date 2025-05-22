import { FC, useCallback, useState } from 'react';
import { Button, Divider, Form, Row, Typography } from 'antd';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import UploadFieldItem from './components/UploadFieldItem';

export const UploadFields: FC = () => {
  const [form] = Form.useForm();

  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });
  const { database, schema, table, queryType } = useDataWarehouse();
  const uploadFields = useUploadFields();
  const updateUploadFields = useUpdateUploadFields();
  const { editMode } = useComponentInfo();

  const removeField = useCallback(
    (index: number) => {
      updateUploadFields(uploadFields.filter((_, i) => i !== index));
    },
    [uploadFields, updateUploadFields],
  );

  const editField = useCallback((index: number) => {
    setUploadFieldsSettingsState({
      isOpen: true,
      editFieldIndex: index,
    });
  }, []);

  const onWidthChange = useCallback(
    (index: number, newWidth: number) => {
      updateUploadFields(
        uploadFields.map((field, i) =>
          i === index ? { ...field, width: newWidth } : field,
        ),
      );
    },
    [uploadFields, updateUploadFields],
  );

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
    <Form
      form={form}
      name="fieldsUploaderForm"
      layout="vertical"
      style={{ height: '100%' }}
      onFinish={handleSubmit}
      data-test="dashboard-edit-properties-form"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {editMode && (
          <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            <Divider style={{ margin: 0 }} orientation="left">
              Поля для загрузки
            </Divider>
          </div>
        )}
        {editMode && (
          <Form.Item style={{ margin: 0, alignSelf: 'center' }}>
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

        {!uploadFields.length && (
          <Typography.Text type="secondary">
            {editMode
              ? t('( Ни одно поле не добавлено. )')
              : t(
                  '( Ни одно поле не добавлено. Для добавления полей перейдите в режим редактирования дэшборда. )',
                )}
          </Typography.Text>
        )}
        <Row justify="center" gutter={[16, 8]}>
          {uploadFields.map((field, index) => (
            <UploadFieldItem
              key={field.name}
              index={index}
              name={field.name}
              type={field.type}
              width={field.width}
              onRemove={removeField}
              onEdit={editField}
              onWidthChange={onWidthChange}
            />
          ))}
        </Row>

        {!editMode && uploadFields.length > 0 && (
          <Form.Item style={{ alignSelf: 'center' }}>
            <Button htmlType="submit" aria-label={t('Загрузить')}>
              {t('Загрузить')}
            </Button>
          </Form.Item>
        )}

        <UploadFieldsSettings
          uploadFieldsSettingsState={uploadFieldsSettingsState}
          setUploadFieldsSettingsState={setUploadFieldsSettingsState}
        />
      </div>
    </Form>
  );
};
