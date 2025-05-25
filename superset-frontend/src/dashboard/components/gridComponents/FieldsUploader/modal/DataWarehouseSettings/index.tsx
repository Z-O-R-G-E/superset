import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { SupersetClient, t } from '@superset-ui/core';
import { Col, Form, Input, Modal, Row, Select, Tooltip } from 'antd';
import rison from 'rison';
import { InfoCircleOutlined } from '@ant-design/icons';
import { DataWarehouseType, UploadDatabaseType } from '../../types';
import {
  useDataWarehouse,
  useUpdateDataWarehouse,
} from '../../contexts/DataWarehouseContext';
import { AsyncSelect } from '../../../../../../components';
import { QueryTypeOptions, SubdTypeOptions } from '../../constants';
import { validateStringLength } from '../../utils/validators/validateStringLength';
import { validateLatinNum } from '../../utils/validators/validateLatinNum';
import { getFilteredFieldTypeOptions } from '../../utils/getFilteredFieldTypeOptions';

interface DataWarehouseSettingsProps {
  isDataWarehouseSettingsOpen: boolean;
  setIsDataWarehouseSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

export const DataWarehouseSettings: FC<DataWarehouseSettingsProps> = ({
  isDataWarehouseSettingsOpen,
  setIsDataWarehouseSettingsOpen,
}) => {
  const [form] = Form.useForm();
  const { subd, database, schema, table, queryType } = useDataWarehouse();
  const updateDataWarehouse = useUpdateDataWarehouse();
  const [hasDeterminedSubd, setHasDeterminedSubd] = useState<boolean>(false);
  const [selectedDatabase, setSelectedDatabase] =
    useState<UploadDatabaseType>();

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

  const handleSubdChange = useCallback(
    (value: string) => {
      form.setFieldsValue({
        subd: value,
      });
    },
    [form],
  );

  const handleDatabaseChange = useCallback(
    (value: UploadDatabaseType, options: any) => {
      const determinedSubd = Array.isArray(options)
        ? options[0]?.subd
        : options?.subd;

      const hasDeterminedSubd =
        getFilteredFieldTypeOptions(determinedSubd).length > 0;
      if (hasDeterminedSubd) {
        setHasDeterminedSubd(true);
        form.setFieldsValue({
          subd: determinedSubd,
        });
      }

      setSelectedDatabase(value);
      form.setFieldsValue({
        schema: undefined,
      });
    },
    [form],
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
            subd: item.backend,
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

  useEffect(() => {
    if (isDataWarehouseSettingsOpen) {
      setSelectedDatabase(database);
      form.setFieldsValue({ subd, database, schema, table, queryType });
    }
  }, [
    database,
    form,
    isDataWarehouseSettingsOpen,
    queryType,
    schema,
    subd,
    table,
  ]);

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
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  {t('СУБД')}
                  <Tooltip title={t('Выберите СУБД')}>
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="subd"
              rules={[{ required: true, message: t('Выбор СУБД обязателен') }]}
              validateFirst
            >
              <Select
                options={SubdTypeOptions}
                placeholder={t('Выберите СУБД')}
                disabled={!selectedDatabase?.value || hasDeterminedSubd}
                allowClear
                showSearch
                onChange={handleSubdChange}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  {t('База данных')}
                  <Tooltip
                    title={t(
                      'Выберите базу данных, в которую будут загружаться файлы',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="database"
              rules={[
                { required: true, message: t('Выбор базы данных обязателен') },
              ]}
              validateFirst
            >
              <AsyncSelect
                ariaLabel={t('Выберите базу данных')}
                options={loadDatabaseOptions}
                allowClear
                showSearch
                onChange={handleDatabaseChange}
                placeholder={t('Выбрать базу данных...')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  {t('Схема')}
                  <Tooltip title={t('Выберите схему в выбранной базе данных')}>
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="schema"
              validateFirst
            >
              <AsyncSelect
                ariaLabel={t('Выберите схему')}
                options={loadSchemaOptions}
                allowClear
                showSearch
                placeholder={t('Выбрать схему...')}
                disabled={!selectedDatabase?.value}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              label={
                <span>
                  {t('Название таблицы')}
                  <Tooltip
                    title={t(
                      'Укажите имя для новой таблицы, которая будет создана',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="table"
              rules={[
                { required: true, message: t('Название таблицы обязательно') },
                { validator: validateLatinNum },
                {
                  validator: (_, value) => validateStringLength(30)(_, value),
                },
              ]}
              validateFirst
              normalize={value => value?.replace(/\s+/g, '_').toLowerCase()}
            >
              <Input
                placeholder={t('например, my_new_table')}
                autoComplete="off"
                disabled={!selectedDatabase?.value}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  {t('Тип запроса')}
                  <Tooltip
                    title={t(
                      'Что должно произойти, если таблица уже существует?:\nREPLACE - Полностью удаляет существующую таблицу и создает новую с данными из полей\nAPPEND - Оставляет существующую таблицу, но добавляет в нее новые строки из полей',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="queryType"
              rules={[{ required: true, message: t('Тип запроса обязателен') }]}
              validateFirst
            >
              <Select
                options={QueryTypeOptions}
                placeholder={t('Выберите тип')}
                disabled={!selectedDatabase?.value}
                allowClear
                showSearch
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
