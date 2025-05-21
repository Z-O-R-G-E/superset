import { FC, useCallback, useState } from 'react';
import { Button, Divider, Form, Row, Typography } from 'antd';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

import UploadFieldItem from '../UploadFieldItem';

import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';

export const UploadFields: FC = () => {
  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

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
      {editMode && (
        <Divider style={{ margin: 0 }} orientation="left">
          Поля для загрузки
        </Divider>
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
  );
};
