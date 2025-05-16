import { FC, memo, useCallback, useState } from 'react';
import { Button, Form, Row, Typography } from 'antd';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';
import {
  useEditMode,
  useUpdateUploadInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import UploadFieldItem from '../UploadFieldItem';

export const UploadFields: FC = memo(() => {
  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const uploadInfo = useUploadInfo();
  const updateUploadInfo = useUpdateUploadInfo();
  const editMode = useEditMode();

  const removeField = useCallback(
    (index: number) => {
      updateUploadInfo(
        'fields',
        uploadInfo.fields.filter((_, i) => i !== index),
      );
    },
    [uploadInfo.fields, updateUploadInfo],
  );

  const editField = useCallback((index: number) => {
    setUploadFieldsSettingsState({
      isOpen: true,
      editFieldIndex: index,
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <Typography.Title style={{ alignSelf: 'flex-start' }} level={5}>
        {t('Поля для загрузки')}
      </Typography.Title>

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

      {!uploadInfo.fields.length && (
        <Typography.Text type="secondary">
          {t('( Ни одно поле не добавлено )')}
        </Typography.Text>
      )}

      <Row justify="center" gutter={[16, 8]}>
        {uploadInfo.fields.map((field, index) => (
          <UploadFieldItem
            key={field.name}
            index={index}
            name={field.name}
            type={field.type}
            width={field.width}
            editMode={editMode}
            onRemove={removeField}
            onEdit={editField}
          />
        ))}
      </Row>

      {!editMode && uploadInfo.fields.length > 0 && (
        <Form.Item style={{ alignSelf: 'center' }}>
          <Button htmlType="submit" aria-label={t('Загрузить')}>
            {t('Загрузить')}
          </Button>
        </Form.Item>
      )}

      <UploadFieldsSettings
        fieldsState={uploadInfo.fields}
        setFieldsState={updater => {
          const newFields =
            typeof updater === 'function'
              ? updater(uploadInfo.fields)
              : updater;
          updateUploadInfo('fields', newFields);
        }}
        uploadFieldsSettingsState={uploadFieldsSettingsState}
        setUploadFieldsSettingsState={setUploadFieldsSettingsState}
      />
    </div>
  );
});
