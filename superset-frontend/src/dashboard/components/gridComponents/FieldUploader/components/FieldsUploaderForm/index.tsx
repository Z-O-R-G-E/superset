import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SupersetClient, t } from '@superset-ui/core';
import rison from 'rison';
import {
  Row,
  Col,
  Form,
  Button,
  Collapse,
  Typography,
  Space,
  Input,
} from 'antd';
import { Flex } from 'antd-v5';
import { MinusCircleOutlined } from '@ant-design/icons';
import { AsyncSelect } from '../../../../../../components';
import {
  AddFieldType,
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
  UploadTableType,
} from '../../types';
import { AddUploadFieldsFormModal } from '../modal';

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

  const onChangeDatabase = (database: UploadDatabaseType) => {
    form.setFieldsValue({ schema: undefined });
    setDatabaseState(database);
    setSchemaState(undefined);
  };

  const onChangeSchema = (schema: UploadSchemaType) => {
    setSchemaState(schema);
  };

  const onChangeTable = (event: ChangeEvent<HTMLInputElement>) => {
    setTableState(event.target.value);
  };

  const onChangeFields = (fields: AddFieldType) => {
    setFieldsState(prevState => ({
      ...prevState,
      [fields.name]: { value: '', type: fields.type },
    }));
  };

  const showAddUploadFieldsFormModal = () => {
    setOpenState(true);
  };

  const hideAddUploadFieldsFormModal = () => {
    setOpenState(false);
  };

  const loadDatabaseOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        const query = rison.encode_uri({
          filters: [
            {
              col: 'allow_file_upload',
              opr: 'eq',
              value: true,
            },
          ],
          page,
          page_size: pageSize,
        });
        return SupersetClient.get({
          endpoint: `/api/v1/database/?q=${query}`,
        }).then(response => {
          const list = response.json.result.map(
            (item: { id: number; database_name: string }) => ({
              value: item.id,
              label: item.database_name,
            }),
          );
          return { data: list, totalCount: response.json.count };
        });
      },
    [],
  );

  const loadSchemaOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        const databaseIndex = databaseState?.value;

        if (!databaseIndex) {
          return Promise.resolve({ data: [], totalCount: 0 });
        }
        return SupersetClient.get({
          endpoint: `/api/v1/database/${databaseIndex}/schemas/`,
        }).then(response => {
          const list = response.json.result.map((item: string) => ({
            value: item,
            label: item,
          }));
          return { data: list, totalCount: response.json.count };
        });
      },
    [databaseState?.value],
  );

  const removeFieldFromComponent = (fieldName: string) => {
    const componentFields = component.uploadInfo.fields;
    delete componentFields[fieldName];
    setFieldsState({ ...componentFields });
  };

  const getFieldsFromComponent = () => {
    const componentFields = component.uploadInfo.fields;
    const fields: {
      type: string;
      name: string;
    }[] = [];
    if (!componentFields) return fields;
    for (const [key, value] of Object.entries(componentFields)) {
      fields.push({
        type: value.type,
        name: key,
      });
    }
    return fields;
  };

  const validateDatabase = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(t('Выбор базы данных обязателен'));
    }
    return Promise.resolve();
  };

  const onFinish = () => {
    const fields = form.getFieldsValue();
    console.log({ ...fields, ...component.uploadInfo });
  };

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
            <Col span={24}>
              <Collapse expandIconPosition="right" defaultActiveKey={['1']}>
                <Collapse.Panel key="1" header="Настройки сервера">
                  <Row gutter={8} justify="space-around" align="top">
                    <Col flex="0 1 300px">
                      <Form.Item
                        label={t('База данных')}
                        required
                        name="database"
                        rules={[{ validator: validateDatabase }]}
                      >
                        <AsyncSelect
                          ariaLabel={t('Выберите базу данных')}
                          options={loadDatabaseOptions}
                          onChange={onChangeDatabase}
                          allowClear
                          placeholder={t('Выбрать...')}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex="0 1 300px">
                      <Form.Item label={t('Схема')} name="schema">
                        <AsyncSelect
                          ariaLabel={t('Выберите схему')}
                          options={loadSchemaOptions}
                          onChange={onChangeSchema}
                          allowClear
                          placeholder={t('Выбрать...')}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex="1 1 300px">
                      <Form.Item
                        label={t('Название таблицы')}
                        name="table"
                        required
                        rules={[
                          {
                            required: true,
                            message: 'Название таблицы обязательно',
                          },
                        ]}
                      >
                        <Input
                          aria-label={t('Название таблицы')}
                          name="table"
                          data-test="properties-modal-name-input"
                          type="text"
                          allowClear
                          onChange={onChangeTable}
                          placeholder={t('Имя таблицы которая будет создана')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Collapse.Panel>
              </Collapse>
            </Col>
          )}
          <Col span={24}>
            <Flex gap="small" vertical align="center" justify="start">
              {editMode && (
                <Form.Item name="add_field">
                  <Button
                    htmlType="button"
                    onClick={showAddUploadFieldsFormModal}
                  >
                    Добавить поле
                  </Button>
                </Form.Item>
              )}
              <Form.Item name="uploadFields" noStyle />

              <Form.Item
                label="Поля для загрузки"
                shouldUpdate={(prevValues, curValues) =>
                  prevValues.uploadFields !== curValues.uploadFields
                }
              >
                {() => {
                  const uploadFields = getFieldsFromComponent();
                  return uploadFields.length ? (
                    <Row gutter={[8, 8]}>
                      {uploadFields.map(({ name, type }) => (
                        <Col key={name}>
                          <Space align="center">
                            <Form.Item
                              name={name}
                              label={`${name}${editMode ? `(${type})` : ''}`}
                            >
                              <Input />
                            </Form.Item>
                            {editMode && (
                              <MinusCircleOutlined
                                onClick={() => {
                                  removeFieldFromComponent(name);
                                }}
                              />
                            )}
                          </Space>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Typography.Text className="ant-form-text" type="secondary">
                      ( Ниодно поле не добавлено. )
                    </Typography.Text>
                  );
                }}
              </Form.Item>
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
        onCancel={hideAddUploadFieldsFormModal}
      />
    </Form.Provider>
  );
};
