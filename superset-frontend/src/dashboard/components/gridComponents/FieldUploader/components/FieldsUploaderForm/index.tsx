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
  AddFieldType,
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';

import { AddUploadFieldsFormModal } from '../../modal';
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
  const [openState, setOpenState] = useState(false);

  const toggleModal = useCallback((state: boolean) => setOpenState(state), []);

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
    // TODO вызов API
  }, []);

  const handleModalFormFinish = useCallback(
    (name: string, { values }) => {
      if (name === 'addUploadFieldsForm') {
        onChangeFields(values);
        toggleModal(false);
      }
    },
    [onChangeFields, toggleModal],
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
              databaseIndex={databaseState?.value}
              onChangeDatabase={onChangeDatabase}
              onChangeSchema={onChangeSchema}
              onChangeTable={onChangeTable}
            />
          )}

          <Col span={24}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {editMode && (
                <Form.Item>
                  <Button htmlType="button" onClick={() => toggleModal(true)}>
                    Добавить поле
                  </Button>
                </Form.Item>
              )}
              <UploadFields
                component={component}
                setFieldsState={setFieldsState}
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

      <AddUploadFieldsFormModal
        open={openState}
        fields={component?.uploadInfo?.fields}
        onCancel={() => toggleModal(false)}
      />
    </Form.Provider>
  );
};
