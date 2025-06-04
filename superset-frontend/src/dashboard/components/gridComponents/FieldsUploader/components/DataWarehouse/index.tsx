import { FC, useState, useMemo } from 'react';
import { Button, Col, Divider, Row, Space } from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { StatusItem } from './components/StatusItem';

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
      },
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
        label: t('Действие'),
        value: alreadyExists,
        successContent: alreadyExists,
        tooltip:
          'Необходимо выбрать действие при наличии таблицы нажав кнопку "Редактировать"',
      },
    ],
    [subd, database, schema, table, alreadyExists],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider orientation="left" style={{ margin: 0 }}>
        {t('Хранилище данных')}
      </Divider>

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
          <div key={index} style={{ overflow: 'hidden' }}>
            <StatusItem {...item} />
          </div>
        ))}
      </div>

      <Row>
        <Col
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Button
            style={{
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: '3rem',
            }}
            onClick={() => setIsDataWarehouseSettingsOpen(true)}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t('Редактировать')}
            </span>
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
