import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Flex } from 'antd-v5';
import { SupersetClient, t } from '@superset-ui/core';
import { SmileOutlined, UserOutlined } from '@ant-design/icons';
import rison from 'rison';
import {
  AntdCollapse,
  AntdForm,
  AsyncSelect,
  Avatar,
  Col,
  Row,
  Space,
  Typography,
  AntdButton,
} from '../../../../../../components';
import { Input } from '../../../../../../components/Input';
import {
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
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
  const [form] = AntdForm.useForm();

  const handleUpdateUploadInfo = useCallback(
    (
      key: string,
      value: string | { value: number | string; label: string } | undefined,
    ) => {
      if (component?.uploadInfo[key] !== value) {
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
    handleUpdateUploadInfo('database', database);
    handleUpdateUploadInfo('schema', undefined);
  };

  const onChangeSchema = (schema: UploadSchemaType) => {
    handleUpdateUploadInfo('schema', schema);
  };

  const onChangeTable = (event: ChangeEvent<HTMLInputElement>) => {
    const table = event.target.value;
    handleUpdateUploadInfo('table', table);
  };

  const onChangeFields = (fields: UploadFieldType) => {
    handleUpdateUploadInfo('fields', fields);
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
        const database = component?.uploadInfo?.database?.value;

        if (!database) {
          return Promise.resolve({ data: [], totalCount: 0 });
        }
        return SupersetClient.get({
          endpoint: `/api/v1/database/${database}/schemas/`,
        }).then(response => {
          const list = response.json.result.map((item: string) => ({
            value: item,
            label: item,
          }));
          return { data: list, totalCount: response.json.count };
        });
      },
    [component?.uploadInfo?.database],
  );

  const validateDatabase = (_: any, value: string) => {
    if (!component?.uploadInfo?.database?.value) {
      return Promise.reject(t('Выбор базы данных обязателен'));
    }
    return Promise.resolve();
  };

  const onFinish = () => {
    const fields = form.getFieldsValue();
    console.log({ ...fields, ...component.uploadInfo });
  };

  useEffect(() => {
    if (component?.uploadInfo) {
      return;
    }
    updateComponents({
      [component.id]: {
        ...component,
        uploadInfo: {
          database: undefined,
          schema: undefined,
          table: '',
          fields: [],
        },
      },
    });
  }, [component, updateComponents]);

  const [open, setOpen] = useState(false);

  const showAddUploadFieldsFormModal = () => {
    setOpen(true);
  };

  const hideAddUploadFieldsFormModal = () => {
    setOpen(false);
  };

  return (
    <AntdForm.Provider
      onFormFinish={(name, { values, forms }) => {
        if (name === 'addUploadFieldsForm') {
          const { fieldsUploaderForm } = forms;
          const uploadFields =
            fieldsUploaderForm.getFieldValue('uploadFields') || [];
          fieldsUploaderForm.setFieldsValue({
            uploadFields: [...uploadFields, values],
          });
          setOpen(false);
        }
      }}
    >
      <AntdForm
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
              <AntdCollapse expandIconPosition="right" defaultActiveKey={['1']}>
                <AntdCollapse.Panel key="1" header="Настройки сервера">
                  <Row gutter={8} justify="space-around" align="top">
                    <Col flex="0 1 300px">
                      <AntdForm.Item
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
                      </AntdForm.Item>
                    </Col>
                    <Col flex="0 1 300px">
                      <AntdForm.Item label={t('Схема')} name="schema">
                        <AsyncSelect
                          ariaLabel={t('Выберите схему')}
                          options={loadSchemaOptions}
                          onChange={onChangeSchema}
                          allowClear
                          placeholder={t('Выбрать...')}
                        />
                      </AntdForm.Item>
                    </Col>
                    <Col flex="1 1 300px">
                      <AntdForm.Item
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
                      </AntdForm.Item>
                    </Col>
                  </Row>
                </AntdCollapse.Panel>
              </AntdCollapse>
            </Col>
          )}
          <Col span={24}>
            <Flex gap="small" vertical align="center" justify="start">
              {editMode && (
                <AntdForm.Item name="add_field">
                  <AntdButton
                    htmlType="button"
                    onClick={showAddUploadFieldsFormModal}
                  >
                    Добавить поле
                  </AntdButton>
                </AntdForm.Item>
              )}
              <AntdForm.Item name="uploadFields" noStyle />

              <AntdForm.Item
                label="Field List"
                shouldUpdate={(prevValues, curValues) =>
                  prevValues.uploadFields !== curValues.uploadFields
                }
              >
                {({ getFieldValue }) => {
                  const uploadFields: {
                    name: string;
                    age: string;
                  }[] = getFieldValue('uploadFields') || [];
                  return uploadFields.length ? (
                    <Row gutter={[8, 8]}>
                      {uploadFields.map(uploadField => (
                        <Space key={uploadField.name}>
                          <Avatar icon={<UserOutlined />} />
                          {`${uploadField.name} - ${uploadField.age}`}
                        </Space>
                      ))}
                    </Row>
                  ) : (
                    <Typography.Text className="ant-form-text" type="secondary">
                      ( <SmileOutlined /> No uploadField yet. )
                    </Typography.Text>
                  );
                }}
              </AntdForm.Item>
            </Flex>
          </Col>
          {!editMode && (
            <Col>
              <AntdForm.Item>
                <AntdButton htmlType="submit" aria-label={t('Загрузить')}>
                  {t('Загрузить')}
                </AntdButton>
              </AntdForm.Item>
            </Col>
          )}
        </Row>
      </AntdForm>
      <AddUploadFieldsFormModal
        open={open}
        onCancel={hideAddUploadFieldsFormModal}
      />
    </AntdForm.Provider>
  );
};
