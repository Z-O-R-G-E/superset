import { FC, useState } from 'react';
import {
  Button,
  Divider,
  Tag,
  Tooltip,
  Row,
  Col,
  Space,
  Typography,
} from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal/DataWarehouseSettings';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';

const { Text } = Typography;

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState(false);
  const { database, schema, table, queryType } = useDataWarehouse();

  const renderStatusItem = (
    label: string,
    value: any,
    successContent: React.ReactNode,
    tooltip: string,
    errorType: 'error' | 'warning' = 'error',
  ) => (
    <Space
      align="center"
      wrap
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: '8px',
        rowGap: '0px',
      }}
    >
      <Text strong style={{ whiteSpace: 'nowrap' }}>
        {label}:
      </Text>
      {value ? (
        <Tag color="success" style={{ marginInlineEnd: 0 }}>
          {successContent}
        </Tag>
      ) : (
        <Tooltip title={t(tooltip)}>
          <Tag color={errorType} style={{ marginInlineEnd: 0 }}>
            {t('Не выбрано')}
          </Tag>
        </Tooltip>
      )}
    </Space>
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider orientation="left" style={{ margin: 0 }}>
        {t('Хранилище данных')}
      </Divider>

      <Row gutter={[16, 16]} justify="space-around" align="middle">
        <Col>
          {renderStatusItem(
            t('База данных'),
            database,
            database?.label,
            'Необходимо выбрать базу данных нажав кнопку "Редактировать"',
          )}
        </Col>

        <Col>
          {renderStatusItem(
            t('Схема'),
            schema,
            schema?.label,
            'Не все базы данных обязательно требуют использования схем. Убедитесь, что для выбранной базы данных схема не требуется, в противном случае выберите схему нажав кнопку "Редактировать"',
            'warning',
          )}
        </Col>

        <Col>
          {renderStatusItem(
            t('Таблица'),
            table?.length > 0,
            table,
            'Необходимо указать наименование таблицы нажав кнопку "Редактировать"',
          )}
        </Col>

        <Col>
          {renderStatusItem(
            t('Тип запроса'),
            queryType,
            queryType,
            'Необходимо выбрать тип запроса нажав кнопку "Редактировать"',
          )}
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
