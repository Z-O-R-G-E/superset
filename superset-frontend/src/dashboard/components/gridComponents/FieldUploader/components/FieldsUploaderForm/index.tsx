import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { t } from '@superset-ui/core';
import { Row, Col, Form, Button } from 'antd';
import { Flex } from 'antd-v5';

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

interface FieldsUploaderFormProps {
  component: UploaderComponentType;
  updateComponents: (components: Record<string, UploaderComponentType>) => void;
  editMode: boolean;
}

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
      if (JSON.stringify(current) !== JSON.stringify(value)) {
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
    const fields = form.getFieldsValue();
    console.log({ ...fields, ...component.uploadInfo });
    // Здесь может быть вызов API или callback
  }, [component.uploadInfo, form]);

  const handleModalFormFinish = useCallback(
    (
      name: string,
      {
        values,
        forms,
      }: {
        values: AddFieldType;
        forms: Record<string, any>; // заменить на точный тип, если возможно
      },
    ) => {
      if (name === 'addUploadFieldsForm') {
        onChangeFields(values);

        const { fieldsUploaderForm } = forms;
        const uploadFields =
          fieldsUploaderForm?.getFieldValue('uploadFields') || [];
        fieldsUploaderForm.setFieldsValue({
          uploadFields: [...uploadFields, values],
        });
        toggleModal(false);
      }
    },
    [onChangeFields, toggleModal],
  );

  useEffect(() => {
    updateUploadInfo('database', databaseState);
  }, [databaseState, updateUploadInfo]);

  useEffect(() => {
    updateUploadInfo('schema', schemaState);
  }, [schemaState, updateUploadInfo]);

  useEffect(() => {
    updateUploadInfo('table', tableState);
  }, [tableState, updateUploadInfo]);

  useEffect(() => {
    updateUploadInfo('fields', fieldsState);
  }, [fieldsState, updateUploadInfo]);

  return (
    <Form.Provider onFormFinish={handleModalFormFinish}>
      <Form
        form={form}
        name="fieldsUploaderForm"
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={component?.uploadInfo || {}}
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
            <Flex gap="small" vertical align="center" justify="start">
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
            </Flex>
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
