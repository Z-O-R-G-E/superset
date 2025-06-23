import { FC, memo } from 'react';
import { Collapse, Divider } from 'antd-v5';
import { t } from '@superset-ui/core';
import { HeaderSettings } from '../HeaderSettings';
import { DataWarehouse } from '../DataWarehouse';
import { ColumnsProperties } from '../ColumnsProperties';
import UploadFields from '../UploadFields';

export const EditMenu: FC = memo(() => (
  <Collapse defaultActiveKey={1} accordion ghost>
    <Collapse.Panel
      header={
        <Divider orientation="left" style={{ margin: 0 }}>
          {t('Заголовок')}
        </Divider>
      }
      key="1"
    >
      <HeaderSettings />
    </Collapse.Panel>
    <Collapse.Panel
      header={
        <Divider orientation="left" style={{ margin: 0 }}>
          {t('Хранилище данных')}
        </Divider>
      }
      key="2"
    >
      <DataWarehouse />
    </Collapse.Panel>
    <Collapse.Panel
      header={
        <Divider orientation="left" style={{ margin: 0 }}>
          {t('Параметры колонок')}
        </Divider>
      }
      key="3"
    >
      <ColumnsProperties />
    </Collapse.Panel>
    <Collapse.Panel
      header={
        <Divider style={{ margin: 0 }} orientation="left">
          {t('Поля для загрузки')}
        </Divider>
      }
      key="4"
    >
      <UploadFields />
    </Collapse.Panel>
  </Collapse>
));
