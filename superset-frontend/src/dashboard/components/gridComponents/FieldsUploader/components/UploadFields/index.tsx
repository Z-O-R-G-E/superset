import { FC, useCallback, useRef, useEffect, useState } from 'react';
import { Button, Form, Row, Typography } from 'antd';
import { throttle } from 'lodash';
import { t } from '@superset-ui/core';
import { useComponentState } from '../../contexts/UploadInfoContext';
import { UploadFieldItem } from '../UploadFieldItem';
import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

export const UploadFields: FC = () => {
  const [uploadFieldsSettingsState, setUploadFieldsSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const { component, updateUploadInfo, editMode } = useComponentState();
  const [fieldsState, setFieldsState] = useState(
    component.meta.uploadInfo?.fields ?? [],
  );

  useEffect(() => {
    updateUploadInfo('fields', fieldsState);
  }, [fieldsState, updateUploadInfo]);

  const throttledSetWidthRef = useRef(
    throttle((index: number, newWidth: number) => {
      setFieldsState(prev =>
        prev.map((field, i) =>
          i === index ? { ...field, width: newWidth } : field,
        ),
      );
    }, 100),
  );

  useEffect(
    () => () => {
      throttledSetWidthRef.current.cancel();
    },
    [],
  );

  const removeField = useCallback(
    (index: number) => {
      setFieldsState(prev => prev.filter((_, i) => i !== index));
    },
    [setFieldsState],
  );

  const editField = useCallback((index: number) => {
    setUploadFieldsSettingsState({
      isOpen: true,
      editFieldIndex: index,
    });
  }, []);

  const renderFields = () => {
    if (!fieldsState.length) {
      return (
        <Typography.Text type="secondary">
          ( Ни одно поле не добавлено )
        </Typography.Text>
      );
    }

    return (
      <Row justify="center" gutter={[16, 8]}>
        {fieldsState.map((field, index) => (
          <UploadFieldItem
            key={`${field.name}-${index}`}
            index={index}
            name={field.name}
            type={field.type}
            width={field.width}
            editMode={editMode}
            onRemove={removeField}
            onEdit={editField}
            onResize={throttledSetWidthRef.current}
          />
        ))}
      </Row>
    );
  };

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
        Поля для загрузки
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

      {renderFields()}

      {!editMode && fieldsState.length > 0 && (
        <Form.Item style={{ alignSelf: 'center' }}>
          <Button htmlType="submit" aria-label={t('Загрузить')}>
            {t('Загрузить')}
          </Button>
        </Form.Item>
      )}

      <UploadFieldsSettings
        fieldsState={fieldsState}
        setFieldsState={setFieldsState}
        uploadFieldsSettingsState={uploadFieldsSettingsState}
        setUploadFieldsSettingsState={setUploadFieldsSettingsState}
      />
    </div>
  );
};
