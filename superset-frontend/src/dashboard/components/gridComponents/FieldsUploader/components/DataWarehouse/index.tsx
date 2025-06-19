import { FC, useState, useMemo } from 'react';
import { Button, Col, Row, Space, Typography } from 'antd-v5';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { StatusItem } from '../StatusItem';

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState(false);
  const { subd, database, schema, table, alreadyExists } = useDataWarehouse();

  const statusItems = useMemo(
    () => [
      {
        label: t('СУБД'),
        value: subd,
        successContent: subd,
        tooltip: 'Необходимо выбрать СУБД нажав кнопку "Редактировать"',
        show: true,
      },
      {
        label: t('База данных'),
        value: database,
        successContent: database?.label,
        tooltip: 'Необходимо выбрать базу данных нажав кнопку "Редактировать"',
        show: true,
      },
      {
        label: t('Схема'),
        value: schema,
        successContent: schema?.label,
        tooltip:
          'Не все базы данных обязательно требуют использования схем. Убедитесь, что для выбранной базы данных схема не требуется, в противном случае выберите схему нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: true,
      },
      {
        label: t('Таблица'),
        value: table?.length > 0,
        successContent: table,
        tooltip:
          'Необходимо указать наименование таблицы нажав кнопку "Редактировать"',
        show: true,
      },
      {
        label: t('Действие'),
        value: alreadyExists,
        successContent: alreadyExists,
        tooltip:
          'Необходимо выбрать действие при наличии таблицы нажав кнопку "Редактировать"',
        show: true,
      },
    ],
    [subd, database, schema, table, alreadyExists],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          rowGap: '16px',
          justifyContent: 'space-around',
        }}
      >
        {statusItems.map((item, index) => (
          <StatusItem key={index} {...item} />
        ))}
      </div>

      <Row>
        <Col
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Button
            htmlType="button"
            aria-label={t('Редактировать')}
            style={{ minWidth: '3rem' }}
            onClick={() => setIsDataWarehouseSettingsOpen(true)}
          >
            <Typography.Text ellipsis>{t('Редактировать')}</Typography.Text>
          </Button>
        </Col>
      </Row>

      <DataWarehouseSettings
        isDataWarehouseSettingsOpen={isDataWarehouseSettingsOpen}
        setIsDataWarehouseSettingsOpen={setIsDataWarehouseSettingsOpen}
      />
    </Space>
  );
};
