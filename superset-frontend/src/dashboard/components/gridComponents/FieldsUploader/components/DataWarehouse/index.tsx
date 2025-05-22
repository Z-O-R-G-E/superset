import { FC, useState } from 'react';
import { Button, Divider, Tag, Tooltip, Row, Col, Space } from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal/DataWarehouseSettings';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState(false);
  const { database, schema, table, queryType } = useDataWarehouse();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider orientation="left" style={{ margin: 0 }}>
        {t('Хранилище данных')}
      </Divider>

      <Row justify="space-around" gutter={[8, 8]} style={{ width: '100%' }}>
        <Col flex="auto" style={{ textAlign: 'center' }}>
          <Space wrap align="center">
            <b>{t('База данных')}:</b>
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
          </Space>
        </Col>

        <Col flex="auto" style={{ textAlign: 'center' }}>
          <Space wrap align="center">
            <b>{t('Схема')}:</b>
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
          </Space>
        </Col>

        <Col flex="auto" style={{ textAlign: 'center' }}>
          <Space wrap align="center">
            <b>{t('Таблица')}:</b>
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
          </Space>
        </Col>

        <Col flex="auto" style={{ textAlign: 'center' }}>
          <Space wrap align="center">
            <b>{t('Тип запроса')}:</b>
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
          </Space>
        </Col>
      </Row>

      <Row justify="center">
        <Button onClick={() => setIsDataWarehouseSettingsOpen(true)}>
          {t('Редактировать')}
        </Button>
      </Row>

      <DataWarehouseSettings
        isDataWarehouseSettingsOpen={isDataWarehouseSettingsOpen}
        setIsDataWarehouseSettingsOpen={setIsDataWarehouseSettingsOpen}
      />
    </Space>
  );
};
