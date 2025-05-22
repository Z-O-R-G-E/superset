import { FC, useState } from 'react';
import { Button, Divider, Form, Tag, Tooltip } from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal/DataWarehouseSettings';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState<boolean>(false);
  const { database, schema, table, queryType } = useDataWarehouse();

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <Divider style={{ margin: 0 }} orientation="left">
          Хранилище данных
        </Divider>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          flexGrow: 1,
          justifyContent: 'space-around',
        }}
      >
        <span>
          <b>База данныз: </b>
          {database ? (
            <Tag color="success">{database.label}</Tag>
          ) : (
            <Tooltip
              title={t(
                'Необходимо выбрать базу данных нажав кнопку "Редактировать"',
              )}
            >
              <Tag color="error">{t('Не выбрана')}</Tag>
            </Tooltip>
          )}
        </span>
        <span>
          <b>Схема: </b>
          {schema ? (
            <Tag color="success">{schema.label}</Tag>
          ) : (
            <Tooltip
              title={t(
                'Не все базы данных обязательно требуют использования схем. Убедитесь, что для выбранной базы данных схема не требуется, в противном случае выберите схему нажав кнопку "Редактировать"',
              )}
            >
              <Tag color="warning">{t('Не выбрана')}</Tag>
            </Tooltip>
          )}
        </span>
        <span>
          <b>Таблица: </b>
          {table.length > 0 ? (
            <Tag color="success">{table}</Tag>
          ) : (
            <Tooltip
              title={t(
                'Необходимо указать наименование таблицы нажав кнопку "Редактировать"',
              )}
            >
              <Tag color="error">{t('Не указано')}</Tag>
            </Tooltip>
          )}
        </span>
        <span>
          <b>Тип запроса: </b>
          {queryType ? (
            <Tag color="success">{queryType}</Tag>
          ) : (
            <Tooltip
              title={t(
                'Необходимо выбрать тип запроса нажав кнопку "Редактировать"',
              )}
            >
              <Tag color="error">{t('Не выбран')}</Tag>
            </Tooltip>
          )}
        </span>
      </div>
      <Form.Item style={{ margin: 0 }}>
        <Button
          htmlType="button"
          onClick={() => setIsDataWarehouseSettingsOpen(true)}
        >
          {t('Редактировать')}
        </Button>
      </Form.Item>
      <DataWarehouseSettings
        isDataWarehouseSettingsOpen={isDataWarehouseSettingsOpen}
        setIsDataWarehouseSettingsOpen={setIsDataWarehouseSettingsOpen}
      />
    </div>
  );
};
