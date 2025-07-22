import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SupersetClient, t } from '@superset-ui/core';
import { Col, Form, Input, Modal, Row, Select } from 'antd-v5';
import rison from 'rison';
import { DataWarehouseType, UploadDatabaseType } from '../../types';
import {
  useDataWarehouse,
  useUpdateDataWarehouse,
} from '../../contexts/DataWarehouseContext';
import { AsyncSelect } from '../../../../../../components';
import {
  AlreadyExistsOptions,
  MODAL_MARK_BACKDROP_FILLER,
  DbmsTypeOptions,
} from '../../constants';
import { validateStringLength, validateLatinNum } from '../../validators';
import { getFilteredFieldTypeOptions, spaceReplace } from '../../utils';

interface DataWarehouseSettingsProps {
  isDataWarehouseSettingsOpen: boolean;
  setIsDataWarehouseSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

export const DataWarehouseSettings: FC<DataWarehouseSettingsProps> = ({
  isDataWarehouseSettingsOpen,
  setIsDataWarehouseSettingsOpen,
}) => {
  const [form] = Form.useForm();
  const { dbms, database, schema, table, alreadyExists } = useDataWarehouse();
  const updateDataWarehouse = useUpdateDataWarehouse();
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

  const handleDbmsChange = useCallback(
    (value: string) => {
      form.setFieldsValue({
        dbms: value,
      });
    },
    [form],
  );

  const handleDatabaseChange = useCallback(
    (value: UploadDatabaseType, options: any) => {
      const determinedDbms = Array.isArray(options)
        ? options[0]?.dbms
        : options?.dbms;

      const hasDeterminedDbms =
        getFilteredFieldTypeOptions(determinedDbms).length > 0;
      if (hasDeterminedDbms) {
        form.setFieldsValue({
          dbms: determinedDbms,
        });
      }

      setSelectedDatabase(value);
      form.setFieldsValue({
        schema: undefined,
      });
    },
    [form],
  );

  const loadDatabaseOptions = useMemo(
    () => (_: any, page: number, pageSize: number) => {
      const query = rison.encode_uri({
        page,
        page_size: pageSize,
      });
      return SupersetClient.get({
        endpoint: `/api/v1/database/?q=${query}`,
      }).then(response => {
        const list = response.json.result.map(
          (item: { id: number; database_name: string; backend: string }) => ({
            value: item.id,
            label: item.database_name,
            dbms: item.backend,
          }),
        );
        return { data: list, totalCount: response.json.count };
      });
    },
    [],
  );

  const loadSchemaOptions = useMemo(
    () => () => {
      if (!selectedDatabase?.value) {
        return Promise.resolve({ data: [], totalCount: 0 });
      }
      return SupersetClient.get({
        endpoint: `/api/v1/database/${selectedDatabase.value}/schemas/`,
      }).then(response => {
        const list = response.json.result.map((item: string) => ({
          value: item,
          label: item,
        }));
        return { data: list, totalCount: response.json.count };
      });
    },
    [selectedDatabase?.value],
  );

  const setDbmsTooltip = useMemo(() => {
    if (!selectedDatabase?.value) {
      return t(
        'СУБД определится автоматически после выбора БД, в противном случае выберите вручную',
      );
    }
    return t('Выберите СУБД');
  }, [selectedDatabase?.value]);

  useEffect(() => {
    if (isDataWarehouseSettingsOpen) {
      setSelectedDatabase(database);
      form.setFieldsValue({ dbms, database, schema, table, alreadyExists });
    }
  }, [
    database,
    form,
    isDataWarehouseSettingsOpen,
    alreadyExists,
    schema,
    dbms,
    table,
  ]);

  return (
    <Modal
      styles={{
        mask: {
          backdropFilter: MODAL_MARK_BACKDROP_FILLER,
        },
      }}
      title={t('Настройки хранилища данных')}
      open={isDataWarehouseSettingsOpen}
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
              label={t('СУБД')}
              tooltip={setDbmsTooltip}
              name="dbms"
              rules={[{ required: true, message: t('Выбор СУБД обязателен') }]}
              validateFirst
            >
              <Select
                options={DbmsTypeOptions}
                placeholder={t('Выберите СУБД')}
                disabled={!selectedDatabase?.value}
                allowClear
                showSearch
                onChange={handleDbmsChange}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={t('База данных')}
              tooltip={t(
                'Выберите базу данных, в которую будут загружаться данные',
              )}
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
              label={t('Схема')}
              tooltip={t('Выберите схему в выбранной базе данных')}
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
              label={t('Таблица')}
              tooltip={
                <span style={{ whiteSpace: 'pre-line' }}>
                  {t('Укажите имя таблицы\n(будет создана при отсутствии)')}
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
              normalize={value => spaceReplace(value).toLowerCase()}
            >
              <Input
                placeholder={t('Название таблицы')}
                autoComplete="off"
                disabled={!selectedDatabase?.value}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={t('Действие')}
              tooltip={
                <span style={{ whiteSpace: 'pre-line' }}>
                  {t(
                    'Что должно произойти, если таблица уже существует?:\nREPLACE - Полностью удаляет существующую таблицу и создает новую с данными из полей.\nAPPEND - Оставляет существующую таблицу, но добавляет в нее новые строки из полей.',
                  )}
                </span>
              }
              name="alreadyExists"
              rules={[
                { required: true, message: t('Выбор действия обязателен') },
              ]}
              validateFirst
            >
              <Select
                options={AlreadyExistsOptions}
                placeholder={t('Выберите действие')}
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
