import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { t } from '@superset-ui/core';
import { Row, Col, Form, Button, Space } from 'antd';

import { isEqual, lowerCase } from 'lodash';
import {
  AddFieldType,
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';

import { UploadFieldsSettingsFormModal } from '../../modal';
import { DatabaseSettings } from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';
import { useComponentState } from '../../contexts/ComponentContext';

export const FieldsUploaderForm: FC = () => {
  const [form] = Form.useForm();

  const { component, updateComponents, editMode } = useComponentState();

  const [databaseState, setDatabaseState] = useState<UploadDatabaseType>(
    component?.uploadInfo?.database ?? { value: '', label: '' },
  );
  const [schemaState, setSchemaState] = useState<UploadSchemaType>(
    component?.uploadInfo?.schema ?? { value: '', label: '' },
  );
  const [tableState, setTableState] = useState<UploadTableType>(
    component?.uploadInfo?.table ?? '',
  );

  const [fieldsState, setFieldsState] = useState<UploadFieldType>(
    component?.uploadInfo?.fields ?? {},
  );
  const [
    uploadFieldsSettingsFormModalState,
    setUploadFieldsSettingsFormModalState,
  ] = useState({ isOpen: false, isEditMode: false });

  const toggleUploadFieldsSettingsFormModal = useCallback(
    (isOpen: boolean, isEditMode: boolean) => {
      setUploadFieldsSettingsFormModalState({ isOpen, isEditMode });
    },
    [],
  );

  const updateUploadInfo = useCallback(
    <K extends keyof UploaderComponentType['uploadInfo']>(
      key: K,
      value: UploaderComponentType['uploadInfo'][K],
    ) => {
      const current = component.uploadInfo?.[key];
      if (!isEqual(current, value)) {
        updateComponents({
          [component.id]: {
            ...component,
            uploadInfo: {
              ...component.uploadInfo,
              [key]: value,
            },
          },
        });
      }
    },
    [component, updateComponents],
  );

  const onChangeDatabase = useCallback(
    (database: UploadDatabaseType) => {
      form.setFieldsValue({ schema: undefined });
      setDatabaseState(database);
      setSchemaState({ value: '', label: '' });
    },
    [form],
  );

  const onChangeSchema = useCallback((schema: UploadSchemaType) => {
    setSchemaState(schema);
  }, []);

  const onChangeTable = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTableState(event.target.value ?? '');
  }, []);

  const onChangeFields = useCallback((field: AddFieldType) => {
    setFieldsState(prev => ({
      ...prev,
      [field.name]: { value: '', type: field.type },
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    // TODO вызов API на запись в БД
  }, []);

  const handleModalFormFinish = useCallback(
    (name: string, { values }) => {
      if (name === 'addUploadFieldsForm') {
        onChangeFields({ ...values, name: lowerCase(values.name) });
        toggleUploadFieldsSettingsFormModal(false, false);
      }
    },
    [onChangeFields, toggleUploadFieldsSettingsFormModal],
  );

  useEffect(() => {
    updateUploadInfo('database', databaseState);
    updateUploadInfo('schema', schemaState);
    updateUploadInfo('table', tableState);
    updateUploadInfo('fields', fieldsState);
  }, [databaseState, schemaState, tableState, fieldsState, updateUploadInfo]);

  const initialValues = useMemo(
    () => component?.uploadInfo || {},
    [component?.uploadInfo],
  );

  return (
    <Form.Provider onFormFinish={handleModalFormFinish}>
      <Form
        form={form}
        name="fieldsUploaderForm"
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={initialValues}
        data-test="dashboard-edit-properties-form"
      >
        <Row gutter={[0, 8]} justify="center" align="top">
          {editMode && (
            <DatabaseSettings
              databaseIndex={component?.uploadInfo?.database.value}
              onChangeDatabase={onChangeDatabase}
              onChangeSchema={onChangeSchema}
              onChangeTable={onChangeTable}
            />
          )}

          <Col span={24}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {editMode && (
                <Form.Item>
                  <Button
                    htmlType="button"
                    onClick={() =>
                      toggleUploadFieldsSettingsFormModal(true, false)
                    }
                  >
                    Добавить поле
                  </Button>
                </Form.Item>
              )}
              <UploadFields
                toggleUploadFieldsSettingsFormModal={
                  toggleUploadFieldsSettingsFormModal
                }
                setFieldsState={setFieldsState}
              />
            </Space>
          </Col>

          {!editMode && (
            <Col>
              <Form.Item>
                <Button htmlType="submit" aria-label={t('Загрузить')}>
                  {t('Загрузить')}
                </Button>
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>

      <UploadFieldsSettingsFormModal
        uploadFieldsSettingsFormModalState={uploadFieldsSettingsFormModalState}
        fields={component?.uploadInfo?.fields}
        onCancel={() => toggleUploadFieldsSettingsFormModal(false, false)}
      />
    </Form.Provider>
  );
};
