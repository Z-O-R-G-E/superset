import { FC, memo } from 'react';
import { Collapse, Divider } from 'antd-v5';
import { t } from '@superset-ui/core';
import { HeaderSettings } from '../HeaderSettings';
import { DataWarehouse } from '../DataWarehouse';
import { ColumnsProperties } from '../ColumnsProperties';
import UploadFields from '../UploadFields';

const PANELS = [
  {
    key: '1',
    title: t('Заголовок'),
    component: <HeaderSettings />,
  },
  {
    key: '2',
    title: t('Хранилище данных'),
    component: <DataWarehouse />,
  },
  {
    key: '3',
    title: t('Параметры колонок'),
    component: <ColumnsProperties />,
  },
  {
    key: '4',
    title: t('Поля для загрузки'),
    component: <UploadFields />,
  },
];

export const EditMenu: FC = memo(() => (
  <Collapse defaultActiveKey={1} accordion ghost>
    {PANELS.map(({ key, title, component }) => (
      <Collapse.Panel
        key={key}
        header={
          <Divider orientation="left" style={{ margin: 0 }}>
            {title}
          </Divider>
        }
      >
        {component}
      </Collapse.Panel>
    ))}
  </Collapse>
));
