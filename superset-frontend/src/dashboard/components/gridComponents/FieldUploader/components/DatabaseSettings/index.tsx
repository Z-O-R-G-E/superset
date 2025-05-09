import { Col, Collapse, Form, Input, Row } from 'antd';
import { SupersetClient, t } from '@superset-ui/core';
import { ChangeEvent, FC, useCallback, useMemo } from 'react';
import rison from 'rison';
import { AsyncSelect } from '../../../../../../components';
import { UploadDatabaseType, UploadSchemaType } from '../../types';
import { useUploadInfoStateController } from '../../contexts/UploadInfoStateController';

interface DatabaseSettingsProps {
  clearSchemaFieldForm: () => void;
}

export const DatabaseSettings: FC<DatabaseSettingsProps> = ({
  clearSchemaFieldForm,
}) => {
  const { databaseState, setDatabaseState, setSchemaState, setTableState } =
    useUploadInfoStateController();
  const databaseIndex = databaseState?.value;
  const onChangeDatabase = useCallback((database: UploadDatabaseType) => {
    clearSchemaFieldForm();
    setDatabaseState(database);
    setSchemaState({ value: '', label: '' });
  }, []);

  const onChangeSchema = useCallback((schema: UploadSchemaType) => {
    setSchemaState(schema);
  }, []);

  const onChangeTable = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTableState(event.target.value ?? '');
  }, []);

  const validateDatabase = (_: unknown, value: string) =>
    value
      ? Promise.resolve()
      : Promise.reject(new Error(t('Выбор базы данных обязателен')));

  const fetchOptions = useCallback(
    async (endpoint: string, transform: (item: any) => any) => {
      const response = await SupersetClient.get({ endpoint });
      return {
        data: response.json.result.map(transform),
        totalCount: response.json.count ?? 0,
      };
    },
    [],
  );

  const loadDatabaseOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        const query = rison.encode_uri({
          filters: [{ col: 'allow_file_upload', opr: 'eq', value: true }],
          page,
          page_size: pageSize,
        });
        return fetchOptions(`/api/v1/database/?q=${query}`, item => ({
          value: item.id,
          label: item.database_name,
        }));
      },
    [fetchOptions],
  );

  const loadSchemaOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        if (!databaseIndex) return Promise.resolve({ data: [], totalCount: 0 });
        return fetchOptions(
          `/api/v1/database/${databaseIndex}/schemas/`,
          item => ({
            value: item,
            label: item,
          }),
        );
      },
    [databaseIndex, fetchOptions],
  );

  return (
    <Col span={24}>
      <Collapse expandIconPosition="right" defaultActiveKey={['1']}>
        <Collapse.Panel key="1" header={t('Настройки сервера')}>
          <Row gutter={8}>
            <Col flex="0 1 300px">
              <Form.Item
                label={t('База данных')}
                name="database"
                rules={[{ validator: validateDatabase }]}
                required
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
                rules={[
                  {
                    required: true,
                    message: t('Название таблицы обязательно'),
                  },
                ]}
              >
                <Input
                  aria-label={t('Название таблицы')}
                  data-test="properties-modal-name-input"
                  onChange={onChangeTable}
                  placeholder={t('Имя таблицы которая будет создана')}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </Collapse.Panel>
      </Collapse>
    </Col>
  );
};
