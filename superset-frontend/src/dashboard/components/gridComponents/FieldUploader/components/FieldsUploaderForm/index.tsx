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
import { isEqual } from 'lodash';
import {
  FieldsUploaderFormProps,
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';

import { UploadFieldsSettingsFormModal } from '../../modal';
import { DatabaseSettings } from '../DatabaseSettings';
import { UploadFields } from '../UploadFields';

export const FieldsUploaderForm: FC<FieldsUploaderFormProps> = ({
  component,
  updateComponents,
  editMode,
}) => {
  const [form] = Form.useForm();

  const [databaseState, setDatabaseState] = useState<UploadDatabaseType>(
    component?.uploadInfo?.database ?? { value: '', label: '' },
  );
  const [schemaState, setSchemaState] = useState<UploadSchemaType>(
    component?.uploadInfo?.schema ?? { value: '', label: '' },
  );
  const [tableState, setTableState] = useState<UploadTableType>(
    component?.uploadInfo?.table ?? '',
  );

  const [fieldsState, setFieldsState] = useState<UploadFieldType[]>(
    component?.uploadInfo?.fields ?? [],
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

  const onChangeFields = useCallback(({ name, type }: UploadFieldType) => {
    setFieldsState(prev => [...prev, { name, type }]);
  }, []);

  const handleSubmit = useCallback(() => {
    // TODO вызов API на запись в БД
  }, []);

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
    <>
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
              databaseIndex={databaseState.value}
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
                fieldsState={fieldsState}
                setFieldsState={setFieldsState}
                toggleUploadFieldsSettingsFormModal={
                  toggleUploadFieldsSettingsFormModal
                }
                editMode={editMode}
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
        fields={fieldsState}
        onChangeFields={onChangeFields}
        toggleUploadFieldsSettingsFormModal={
          toggleUploadFieldsSettingsFormModal
        }
        uploadFieldsSettingsFormModalState={uploadFieldsSettingsFormModalState}
      />
    </>
  );
};
