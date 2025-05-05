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
  updateComponents: Function;
  editMode: boolean;
}

export const FieldsUploaderForm: FC<FieldsUploaderFormProps> = ({
  component,
  updateComponents,
  editMode,
}) => {
  const [databaseState, setDatabaseState] = useState<
    UploadDatabaseType | undefined
  >(component?.uploadInfo?.database);
  const [schemaState, setSchemaState] = useState<UploadSchemaType | undefined>(
    component?.uploadInfo?.schema,
  );
  const [tableState, setTableState] = useState<UploadTableType | undefined>(
    component?.uploadInfo?.table,
  );
  const [fieldsState, setFieldsState] = useState<UploadFieldType | undefined>(
    component?.uploadInfo?.fields,
  );
  const [openState, setOpenState] = useState<boolean>(false);
  const [form] = Form.useForm();

  const toggleModal = (state: boolean) => setOpenState(state);

  const updateUploadInfo = useCallback(
    (key: string, value: any) => {
      if (component.uploadInfo[key] !== value) {
        updateComponents({
          [component.id]: {
            ...component,
            uploadInfo: {
              ...component?.uploadInfo,
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
      setSchemaState(undefined);
    },
    [form],
  );
  const onChangeSchema = useCallback((schema: UploadSchemaType) => {
    setSchemaState(schema);
  }, []);

  const onChangeTable = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTableState(event.target.value);
  }, []);

  const onChangeFields = useCallback((fields: AddFieldType) => {
    setFieldsState(prevState => ({
      ...prevState,
      [fields.name]: { value: '', type: fields.type },
    }));
  }, []);

  const onFinish = useCallback(() => {
    const fields = form.getFieldsValue();
    console.log({ ...fields, ...component.uploadInfo });
  }, [component.uploadInfo, form]);

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
    <Form.Provider
      onFormFinish={(name, { values, forms }) => {
        if (name === 'addUploadFieldsForm') {
          onChangeFields(values as AddFieldType);

          const { fieldsUploaderForm } = forms;
          const uploadFields =
            fieldsUploaderForm.getFieldValue('uploadFields') || [];

          fieldsUploaderForm.setFieldsValue({
            uploadFields: [...uploadFields, values],
          });
          setOpenState(false);
        }
      }}
    >
      <Form
        form={form}
        name="fieldsUploaderForm"
        onFinish={onFinish}
        data-test="dashboard-edit-properties-form"
        layout="vertical"
        initialValues={component?.uploadInfo}
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
                <Form.Item name="add_field">
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
