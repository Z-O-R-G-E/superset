import { FC, ReactNode } from 'react';
import { Divider, Typography, ConfigProvider } from 'antd-v5';

import { t, useTheme } from '@superset-ui/core';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';

interface LayoutProps {
  children: ReactNode;
}

const Wrapper: FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { database, table, alreadyExists } = useDataWarehouse();
  const { active, label } = useHeader();
  const { editMode } = useComponentInfo();

  const isDatabaseReady = database && alreadyExists && table.length > 0;

  return (
    <ConfigProvider
      theme={{
        components: {
          Button: {
            defaultBg: theme.colors.grayscale.light4,
          },
          Input: {
            colorBgContainer: theme.colors.grayscale.light5,
          },
          Modal: {
            titleFontSize: 20,
            contentBg: theme.colors.grayscale.light5,
            footerBg: 'transparent',
            headerBg: theme.colors.grayscale.light5,
          },
          Select: {
            selectorBg: theme.colors.grayscale.light5,
            colorBgElevated: theme.colors.grayscale.light5,
          },
        },
      }}
    >
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
    </ConfigProvider>
  );
};

export default Wrapper;
