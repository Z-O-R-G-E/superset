import { ChangeEvent, FC, useCallback, useEffect, useMemo } from 'react';
import { Collapse, Flex } from 'antd-v5';
import { SupersetClient, t } from '@superset-ui/core';
import { MinusCircleOutlined } from '@ant-design/icons';
import rison from 'rison';
import { AntdForm, AsyncSelect, Col, Row } from '../../../../../../components';
import { StyledFormItem } from '../../../../../../features/databases/UploadDataModel/styles';
import { Input } from '../../../../../../components/Input';
import Button from '../../../../../../components/Button';
import {
  UploadDatabaseType,
  UploaderComponentType,
  UploadFieldType,
  UploadSchemaType,
} from '../../types';

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
    console.log(fields);
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

  return (
    <AntdForm
      form={form}
      onFinish={onFinish}
      data-test="dashboard-edit-properties-form"
      layout="vertical"
      initialValues={component?.uploadInfo}
    >
      <Row gutter={[0, 8]} justify="center" align="top">
        {editMode && (
          <Col span={24}>
            <Collapse
              expandIconPosition="end"
              items={[
                {
                  key: '1',
                  label: 'Настройка базы данных',
                  children: (
                    <Row gutter={8} justify="space-around" align="top">
                      <Col flex="0 1 300px">
                        <StyledFormItem
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
                        </StyledFormItem>
                      </Col>
                      <Col flex="0 1 300px">
                        <StyledFormItem label={t('Схема')} name="schema">
                          <AsyncSelect
                            ariaLabel={t('Выберите схему')}
                            options={loadSchemaOptions}
                            onChange={onChangeSchema}
                            allowClear
                            placeholder={t('Выбрать...')}
                          />
                        </StyledFormItem>
                      </Col>
                      <Col flex="1 1 300px">
                        <StyledFormItem
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
                        </StyledFormItem>
                      </Col>
                    </Row>
                  ),
                },
              ]}
              defaultActiveKey={['1']}
            />
          </Col>
        )}
        <Col span={24}>
          <AntdForm.List name="fields">
            {(fields, { add, remove }, { errors }) => (
              <Flex gap="small" vertical align="center" justify="start">
                {editMode && (
                  <StyledFormItem name="add_field">
                    <Button
                      onClick={() => add()}
                      aria-label={t('Добавить поле')}
                    >
                      {t('Добавить поле')}
                    </Button>
                    <AntdForm.ErrorList errors={errors} />
                  </StyledFormItem>
                )}
                <Row gutter={[8, 8]}>
                  {fields.map((field, index) => (
                    <Col>
                      <Flex
                        justify="center"
                        align="center"
                        gap="small"
                        key={field.key}
                      >
                        <StyledFormItem noStyle>
                          <Input />
                        </StyledFormItem>
                        <MinusCircleOutlined
                          className="dynamic-delete-button"
                          onClick={() => remove(field.name)}
                        />
                      </Flex>
                    </Col>
                  ))}
                </Row>
              </Flex>
            )}
          </AntdForm.List>
        </Col>
        {!editMode && (
          <Col>
            <StyledFormItem name="upload_fields">
              <Button
                type="primary"
                htmlType="submit"
                aria-label={t('Загрузить')}
              >
                {t('Загрузить')}
              </Button>
            </StyledFormItem>
          </Col>
        )}
      </Row>
    </AntdForm>
  );
};
