import { FC, useCallback, memo } from 'react';
import { Col, Collapse, Form, Input, Row, Select } from 'antd';
import { SupersetClient, t } from '@superset-ui/core';
import rison from 'rison';
import { AsyncSelect } from '../../../../../../components';
import { UploadDatabaseType, UploadSchemaType } from '../../types';

import { QueryTypeOptions } from '../../constants';
import {
  useDataWarehouse,
  useUpdateDataWarehouse,
} from '../../contexts/DataWarehouseContext';

const DatabaseSettings: FC = memo(() => {
  const dataWarehouse = useDataWarehouse();
  const updateDataWarehouse = useUpdateDataWarehouse();

  const handleDatabaseChange = useCallback(
    (value: UploadDatabaseType) => {
      updateDataWarehouse({ ...dataWarehouse, database: value });
    },
    [dataWarehouse, updateDataWarehouse],
  );

  const handleSchemaChange = useCallback(
    (value: UploadSchemaType) => {
      updateDataWarehouse({ ...dataWarehouse, schema: value });
    },
    [dataWarehouse, updateDataWarehouse],
  );

  const handleTableChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateDataWarehouse({ ...dataWarehouse, table: e.target.value });
    },
    [dataWarehouse, updateDataWarehouse],
  );

  const handleQueryTypeChange = useCallback(
    (value: string) => {
      updateDataWarehouse({ ...dataWarehouse, queryType: value });
    },
    [dataWarehouse, updateDataWarehouse],
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
      if (!dataWarehouse.database?.value) return { data: [], totalCount: 0 };

      try {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${dataWarehouse.database.value}/schemas/`,
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
    [dataWarehouse?.database?.value],
  );

  const validateDatabase = useCallback((_: any, value: UploadDatabaseType) => {
    if (!value?.value) {
      return Promise.reject(new Error(t('Выбор базы данных обязателен')));
    }
    return Promise.resolve();
  }, []);

  const validateSchema = useCallback(
    (_: any, value: UploadSchemaType) => {
      if (!dataWarehouse.database?.value) return Promise.resolve();
      return Promise.resolve();
    },
    [dataWarehouse.database?.value],
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

  return (
    <Collapse expandIconPosition="right" defaultActiveKey={['1']}>
      <Collapse.Panel key="1" header={t('Настройки хранилища данных')}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Row gutter={8}>
            <Col flex="1 0 50%">
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
                  onChange={handleDatabaseChange}
                  allowClear
                  placeholder={t('Выбрать...')}
                />
              </Form.Item>
            </Col>
            <Col flex="1 0 50%">
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
                  onChange={handleSchemaChange}
                  allowClear
                  placeholder={t('Выбрать...')}
                  disabled={!dataWarehouse.database?.value}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col flex="1 0 70%">
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
                  onChange={handleTableChange}
                  placeholder={t('Имя таблицы которая будет создана')}
                  autoComplete="off"
                  disabled={!dataWarehouse.database?.value}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col flex="1 0 30%">
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
                  onChange={handleQueryTypeChange}
                  placeholder={t('Выберите тип запроса')}
                  disabled={!dataWarehouse.database?.value}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Collapse.Panel>
    </Collapse>
  );
});

export default DatabaseSettings;
