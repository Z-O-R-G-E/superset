import { FC, ReactNode } from 'react';
import { Divider, Typography } from 'antd';
import { t } from '@superset-ui/core';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';

interface LayoutProps {
  children: ReactNode;
}

const Wrapper: FC<LayoutProps> = ({ children }) => {
  const { database, table, queryType } = useDataWarehouse();
  const { active, label } = useHeader();
  const { editMode } = useComponentInfo();

  const isDatabaseReady = database && queryType && table.length > 0;

  return (
    <>
      {!editMode && active && (
        <div>
          <Divider style={{ margin: 0 }} orientation="left">
            {label}
          </Divider>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden auto',
          gap: '0.5rem',
        }}
      >
        {editMode || isDatabaseReady ? (
          <>{children}</>
        ) : (
          <div
            style={{
              display: 'flex',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography.Text style={{ textAlign: 'center' }} type="secondary">
              {t(
                'Хранилище данных не настроено. Для настройки перейдите в режим редактирования дэшборда.',
              )}
            </Typography.Text>
          </div>
        )}
      </div>
    </>
  );
};

export default Wrapper;
