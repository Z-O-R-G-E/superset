import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { SupersetClient, t } from '@superset-ui/core';
import { Col, Form, Input, Modal, Row, Select } from 'antd';

import rison from 'rison';
import {
  DataWarehouseType,
  UploadDatabaseType,
  UploadSchemaType,
} from '../../types';
import {
  useDataWarehouse,
  useUpdateDataWarehouse,
} from '../../contexts/DataWarehouseContext';
import { AsyncSelect } from '../../../../../../components';
import { QueryTypeOptions } from '../../constants';

interface DataWarehouseSettingsProps {
  isDataWarehouseSettingsOpen: boolean;
  setIsDataWarehouseSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

export const DataWarehouseSettings: FC<DataWarehouseSettingsProps> = ({
  isDataWarehouseSettingsOpen,
  setIsDataWarehouseSettingsOpen,
}) => {
  const [selectedDatabase, setSelectedDatabase] =
    useState<UploadDatabaseType>();
  const { database, schema, table, queryType } = useDataWarehouse();
  const updateDataWarehouse = useUpdateDataWarehouse();

  const [form] = Form.useForm();

  const onClose = useCallback(() => {
    setIsDataWarehouseSettingsOpen(false);
  }, [setIsDataWarehouseSettingsOpen]);

  const handleSubmit = useCallback(
    (values: DataWarehouseType) => {
      updateDataWarehouse(values);
      onClose();
    },
    [onClose, updateDataWarehouse],
  );

  const handleDatabaseChange = useCallback(
    (value: UploadDatabaseType) => {
      setSelectedDatabase(value);
      form.setFieldsValue({
        database: value,
        schema: undefined,
        table,
        queryType,
      });
    },
    [form, queryType, table],
  );

  const loadDatabaseOptions = useCallback(
    async (input = '', page: number, pageSize: number) => {
      try {
        const query = rison.encode_uri({
          filters: [{ col: 'allow_file_upload', opr: 'eq', value: true }],
          page,
          page_size: pageSize,
        });
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/?q=${query}`,
        });
        return {
          data: response.json.result.map((item: any) => ({
            value: item.id,
            label: item.database_name,
          })),
          totalCount: response.json.count,
        };
      } catch (error) {
        console.error('Failed to load databases', error);
        return { data: [], totalCount: 0 };
      }
    },
    [],
  );

  const loadSchemaOptions = useCallback(
    async (input = '', page: number, pageSize: number) => {
      if (!selectedDatabase?.value) return { data: [], totalCount: 0 };

      try {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${selectedDatabase.value}/schemas/`,
        });
        return {
          data: response.json.result.map((item: any) => ({
            value: item,
            label: item,
          })),
          totalCount: response.json.count,
        };
      } catch (error) {
        console.error('Failed to load schemas', error);
        return { data: [], totalCount: 0 };
      }
    },
    [selectedDatabase?.value],
  );

  const validateDatabase = useCallback((_: any, value: UploadDatabaseType) => {
    if (!value?.value) {
      return Promise.reject(new Error(t('Выбор базы данных обязателен')));
    }
    return Promise.resolve();
  }, []);

  const validateSchema = useCallback(
    (_: any, value: UploadSchemaType) => {
      if (!selectedDatabase?.value) return Promise.resolve();
      return Promise.resolve();
    },
    [selectedDatabase?.value],
  );

  const validateTableName = useCallback((_: any, value: string) => {
    if (!value || value.trim().length === 0) {
      return Promise.reject(new Error(t('Название таблицы обязательно')));
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      return Promise.reject(
        new Error(
          t(
            'Название таблицы должно начинаться с буквы или _ и содержать только буквы, цифры и _',
          ),
        ),
      );
    }
    if (value.length > 63) {
      return Promise.reject(
        new Error(t('Название таблицы не должно превышать 63 символа')),
      );
    }
    return Promise.resolve();
  }, []);

  const validateQueryType = useCallback((_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error(t('Тип запроса обязателен')));
    }
    return Promise.resolve();
  }, []);

  useEffect(() => {
    if (isDataWarehouseSettingsOpen) {
      setSelectedDatabase(database);
      form.setFieldsValue({ database, schema, table, queryType });
    }
  }, [database, form, isDataWarehouseSettingsOpen, queryType, schema, table]);

  return (
    <Modal
      title={t('Настройки хранилища данных')}
      visible={isDataWarehouseSettingsOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      centered
      destroyOnClose
      width={700}
      data-test="datawarehouse-settings-modal"
    >
      <Form
        name="dataWarehouseSettingsForm"
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                label={t('База данных')}
                name="database"
                rules={[
                  {
                    required: true,
                    validator: validateDatabase,
                  },
                ]}
                validateFirst
              >
                <AsyncSelect
                  ariaLabel={t('Выберите базу данных')}
                  options={loadDatabaseOptions}
                  allowClear
                  onChange={handleDatabaseChange}
                  placeholder={t('Выбрать...')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('Схема')}
                name="schema"
                rules={[
                  {
                    validator: validateSchema,
                  },
                ]}
                validateFirst
              >
                <AsyncSelect
                  ariaLabel={t('Выберите схему')}
                  options={loadSchemaOptions}
                  allowClear
                  placeholder={t('Выбрать...')}
                  disabled={!selectedDatabase?.value}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={16}>
              <Form.Item
                label={t('Название таблицы')}
                name="table"
                rules={[
                  {
                    required: true,
                    message: t('Название таблицы обязательно'),
                  },
                  {
                    validator: validateTableName,
                  },
                ]}
                validateFirst
              >
                <Input
                  aria-label={t('Название таблицы')}
                  placeholder={t('Имя таблицы которая будет создана')}
                  autoComplete="off"
                  disabled={!selectedDatabase?.value}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="queryType"
                label={t('Тип запроса')}
                rules={[
                  {
                    required: true,
                    validator: validateQueryType,
                  },
                ]}
                validateFirst
              >
                <Select
                  options={QueryTypeOptions}
                  placeholder={t('Выберите тип запроса')}
                  disabled={!selectedDatabase?.value}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  );
};
