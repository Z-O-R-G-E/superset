import { Col, Collapse, Form, Input, Row } from 'antd';
import { SupersetClient, t } from '@superset-ui/core';
import { ChangeEvent, FC, useMemo } from 'react';
import rison from 'rison';
import { AsyncSelect } from '../../../../../../components';
import { UploadDatabaseType, UploadSchemaType } from '../../types';

interface DatabaseSettingsProps {
  databaseIndex: number | undefined;
  onChangeDatabase: (database: UploadDatabaseType) => void;
  onChangeSchema: (schema: UploadSchemaType) => void;
  onChangeTable: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const DatabaseSettings: FC<DatabaseSettingsProps> = ({
  databaseIndex,
  onChangeDatabase,
  onChangeSchema,
  onChangeTable,
}) => {
  const validateDatabase = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(t('Выбор базы данных обязателен'));
    }
    return Promise.resolve();
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
    [databaseIndex],
  );
  return (
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
  );
};
