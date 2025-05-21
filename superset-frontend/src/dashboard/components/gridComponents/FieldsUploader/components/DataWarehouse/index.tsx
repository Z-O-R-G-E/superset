import { FC, useState } from 'react';
import { Button, Form } from 'antd';
import { t } from '@superset-ui/core';
import { DataWarehouseSettings } from '../../modal/DataWarehouseSettings';

export const DataWarehouse: FC = () => {
  const [isDataWarehouseSettingsOpen, setIsDataWarehouseSettingsOpen] =
    useState<boolean>(false);

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span>База данныз</span>
        <span>Схема</span>
        <span>Таблица</span>
        <span>Тип запроса</span>
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
