import { FC, useCallback, memo } from 'react';
import { Col, Collapse, Form, Input, Row } from 'antd';
import { SupersetClient, t } from '@superset-ui/core';
import rison from 'rison';
import { AsyncSelect } from '../../../../../../components';
import { UploadDatabaseType, UploadSchemaType } from '../../types';
import {
  useUpdateUploadInfo,
  useUploadInfo,
} from '../../contexts/UploadInfoContext';

interface DatabaseSettingsProps {
  clearSchemaFieldForm: () => void;
}

const DatabaseSettings: FC<DatabaseSettingsProps> = memo(
  ({ clearSchemaFieldForm }) => {
    const uploadInfo = useUploadInfo();
    const updateUploadInfo = useUpdateUploadInfo();

    const handleDatabaseChange = useCallback(
      (value: UploadDatabaseType) => {
        updateUploadInfo('database', value);
        updateUploadInfo('schema', { value: '', label: '' });
        clearSchemaFieldForm();
      },
      [updateUploadInfo, clearSchemaFieldForm],
    );

    const handleSchemaChange = useCallback(
      (value: UploadSchemaType) => {
        updateUploadInfo('schema', value);
      },
      [updateUploadInfo],
    );

    const handleTableChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateUploadInfo('table', e.target.value);
      },
      [updateUploadInfo],
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
        if (!uploadInfo.database?.value) return { data: [], totalCount: 0 };

        try {
          const response = await SupersetClient.get({
            endpoint: `/api/v1/database/${uploadInfo.database.value}/schemas/`,
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
      [uploadInfo.database?.value],
    );

    const validateDatabase = useCallback(
      async (_: unknown, value: UploadDatabaseType) => {
        if (!value?.value) {
          throw new Error(t('Выбор базы данных обязателен'));
        }
      },
      [],
    );

    return (
      <Collapse expandIconPosition="right" defaultActiveKey={['1']}>
        <Collapse.Panel key="1" header={t('Настройки базы данных')}>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <Row gutter={8}>
              <Col flex="auto">
                <Form.Item
                  label={t('База данных')}
                  name="database"
                  rules={[{ validator: validateDatabase }]}
                  required
                >
                  <AsyncSelect
                    ariaLabel={t('Выберите базу данных')}
                    options={loadDatabaseOptions}
                    onChange={handleDatabaseChange}
                    value={uploadInfo.database}
                    allowClear
                    placeholder={t('Выбрать...')}
                  />
                </Form.Item>
              </Col>
              <Col flex="auto">
                <Form.Item label={t('Схема')} name="schema">
                  <AsyncSelect
                    ariaLabel={t('Выберите схему')}
                    options={loadSchemaOptions}
                    onChange={handleSchemaChange}
                    value={uploadInfo.schema}
                    allowClear
                    placeholder={t('Выбрать...')}
                    disabled={!uploadInfo.database?.value}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={t('Название таблицы')}
              name="table"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t('Название таблицы обязательно'),
                },
              ]}
            >
              <Input
                aria-label={t('Название таблицы')}
                onChange={handleTableChange}
                value={uploadInfo.table}
                placeholder={t('Имя таблицы которая будет создана')}
                allowClear
              />
            </Form.Item>
          </div>
        </Collapse.Panel>
      </Collapse>
    );
  },
);

export default DatabaseSettings;
