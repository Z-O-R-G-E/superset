import { FC, useCallback, useRef, useEffect, useState } from 'react';
import { Button, Form, Row, Typography } from 'antd';
import { throttle } from 'lodash';
import { t } from '@superset-ui/core';

import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType, UploadFieldType } from '../../types';
import {
  useEditMode,
  useUpdateUploadInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';
import UploadFieldItem from '../UploadFieldItem';

export const UploadFields: FC = () => {
  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const uploadInfo = useUploadInfo();
  const updateUploadInfo = useUpdateUploadInfo();
  const editMode = useEditMode();
  const [isFieldResizing, setIsFieldResizing] = useState<boolean>(false);

  const throttledSetWidthRef = useRef(
    throttle((fields: UploadFieldType[], index: number, newWidth: number) => {
      const updatedFields = fields.map((field, i) =>
        i === index ? { ...field, width: newWidth } : field,
      );
      updateUploadInfo('fields', updatedFields);
    }, 100),
  );

  useEffect(() => {
    const throttledSetWidth = throttledSetWidthRef.current;
    return () => {
      throttledSetWidth.cancel();
    };
  }, []);

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

  const handleResize = useCallback(
    (index: number, newWidth: number) => {
      throttledSetWidthRef.current(uploadInfo.fields, index, newWidth);
    },
    [uploadInfo.fields],
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
            key={`${field.name}-${index}`}
            index={index}
            name={field.name}
            type={field.type}
            width={field.width}
            editMode={editMode}
            onRemove={removeField}
            onEdit={editField}
            onResize={handleResize}
            isFieldResizing={isFieldResizing}
            setIsFieldResizing={setIsFieldResizing}
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
};
