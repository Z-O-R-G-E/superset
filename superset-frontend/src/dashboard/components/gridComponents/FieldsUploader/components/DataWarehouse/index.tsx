import { FC, useState, useMemo } from 'react';
import { Button, Divider, Row, Col, Space } from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal/DataWarehouseSettings';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { StatusItem } from './StatusItem';

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState(false);
  const { database, schema, table, queryType } = useDataWarehouse();

  const statusItems = useMemo(
    () => [
      {
        label: t('База данных'),
        value: database,
        successContent: database?.label,
        tooltip: 'Необходимо выбрать базу данных нажав кнопку "Редактировать"',
      },
      {
        label: t('Схема'),
        value: schema,
        successContent: schema?.label,
        tooltip:
          'Не все базы данных обязательно требуют использования схем. Убедитесь, что для выбранной базы данных схема не требуется, в противном случае выберите схему нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
      },
      {
        label: t('Таблица'),
        value: table?.length > 0,
        successContent: table,
        tooltip:
          'Необходимо указать наименование таблицы нажав кнопку "Редактировать"',
      },
      {
        label: t('Тип запроса'),
        value: queryType,
        successContent: queryType,
        tooltip: 'Необходимо выбрать тип запроса нажав кнопку "Редактировать"',
      },
    ],
    [database, schema, table, queryType],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider orientation="left" style={{ margin: 0 }}>
        {t('Хранилище данных')}
      </Divider>

      <Row gutter={[16, 16]} justify="space-around" align="middle">
        {statusItems.map((item, index) => (
          <Col key={index}>
            <StatusItem {...item} />
          </Col>
        ))}
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
