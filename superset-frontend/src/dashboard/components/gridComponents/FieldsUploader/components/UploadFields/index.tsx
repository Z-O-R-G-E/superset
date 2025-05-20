import { FC, useCallback, useState } from 'react';
import { Button, Form, Row, Typography } from 'antd';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

import UploadFieldItem from '../UploadFieldItem';
import {
  useUpdateUploadInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';

export const UploadFields: FC = () => {
  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const { fields } = useUploadInfo();
  const updateUploadInfo = useUpdateUploadInfo();
  const { editMode } = useComponentInfo();

  const removeField = useCallback(
    (index: number) => {
      updateUploadInfo(
        'fields',
        fields.filter((_, i) => i !== index),
      );
    },
    [fields, updateUploadInfo],
  );

  const editField = useCallback((index: number) => {
    setUploadFieldsSettingsState({
      isOpen: true,
      editFieldIndex: index,
    });
  }, []);

  const onWidthChange = useCallback(
    (index: number, newWidth: number) => {
      updateUploadInfo(
        'fields',
        fields.map((field, i) =>
          i === index ? { ...field, width: newWidth } : field,
        ),
      );
    },
    [fields, updateUploadInfo],
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

      {!fields.length && (
        <Typography.Text type="secondary">
          {editMode
            ? t('( Ни одно поле не добавлено. )')
            : t(
                '( Ни одно поле не добавлено. Для добавления полей перейдите в режим редактирования дэшборда. )',
              )}
        </Typography.Text>
      )}

      <Row justify="center" gutter={[16, 8]}>
        {fields.map((field, index) => (
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

      {!editMode && fields.length > 0 && (
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
