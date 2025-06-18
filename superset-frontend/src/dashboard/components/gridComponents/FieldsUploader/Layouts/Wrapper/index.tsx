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
            borderColorDisabled: '#d9d9d9',
            dangerColor: '#fff',
            defaultActiveBg: '#ffffff',
            defaultActiveBorderColor: '#0958d9',
            defaultActiveColor: '#0958d9',
            defaultBg: '#ffffff',
            defaultBorderColor: '#d9d9d9',
            defaultColor: 'rgba(0,0,0,0.88)',
            defaultGhostBorderColor: '#ffffff',
            defaultGhostColor: '#ffffff',
            defaultHoverBg: '#ffffff',
            defaultHoverBorderColor: '#4096ff',
            defaultHoverColor: '#4096ff',
            ghostBg: 'transparent',
            groupBorderColor: '#4096ff',
            linkHoverBg: 'transparent',
            primaryColor: '#fff',
            textHoverBg: 'rgba(0,0,0,0.04)',
            colorBgContainer: '#ffffff',
            colorBgContainerDisabled: 'rgba(0, 0, 0, 0.04)',
            colorBgTextActive: 'rgba(0, 0, 0, 0.15)',
            colorBorder: '#d9d9d9',
            colorError: '#ff4d4f',
            colorErrorActive: '#d9363e',
            colorErrorBg: '#fff2f0',
            colorErrorBgActive: '#ffccc7',
            colorErrorBorderHover: '#ffa39e',
            colorErrorHover: '#ff7875',
            colorFill: 'rgba(0,0,0,0.15)',
            colorFillSecondary: 'rgba(0,0,0,0.06)',
            colorFillTertiary: 'rgba(0,0,0,0.04)',
            colorInfo: '#1677ff',
            colorInfoActive: '#0958d9',
            colorInfoHover: '#69b1ff',
            colorLink: '#1677ff',
            colorLinkActive: '#0958d9',
            colorLinkHover: '#69b1ff',
            colorPrimary: '#1677ff',
            colorPrimaryActive: '#0958d9',
            colorPrimaryBg: '#e6f4ff',
            colorPrimaryBgHover: '#bae0ff',
            colorPrimaryBorder: '#91caff',
            colorPrimaryHover: '#4096ff',
            colorPrimaryText: '#1677ff',
            colorPrimaryTextActive: '#0958d9',
            colorPrimaryTextHover: '#4096ff',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextDisabled: 'rgba(0,0,0,0.25)',
            colorTextLightSolid: '#fff',
          },
          Input: {
            activeBg: '#ffffff',
            activeBorderColor: '#1677ff',
            addonBg: 'rgba(0,0,0,0.02)',
            hoverBg: '#ffffff',
            hoverBorderColor: '#4096ff',
            colorBgContainer: '#ffffff',
            colorBgContainerDisabled: 'rgba(0,0,0,0.04)',
            colorBorder: '#d9d9d9',
            colorError: '#ff4d4f',
            colorErrorBg: '#fff2f0',
            colorErrorText: '#ff4d4f',
            colorFillTertiary: 'rgba(0,0,0,0.04)',
            colorPrimaryActive: '#0958d9',
            colorPrimaryHover: '#4096ff',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextDescription: 'rgba(0,0,0,0.45)',
            colorTextDisabled: 'rgba(0,0,0,0.25)',
            colorWarning: '#faad14',
            colorWarningBg: '#fffbe6',
            colorWarningText: '#faad14',
          },
          Select: {
            colorPrimaryHover: '#4096ff',
            clearBg: '#ffffff',
            multipleItemBg: 'rgba(0,0,0,0.06)',
            multipleItemBorderColor: 'transparent',
            multipleItemBorderColorDisabled: 'transparent',
            multipleItemColorDisabled: 'rgba(0,0,0,0.25)',
            multipleSelectorBgDisabled: 'rgba(0,0,0,0.04)',
            optionActiveBg: 'rgba(0,0,0,0.04)',
            optionSelectedBg: '#e6f4ff',
            optionSelectedColor: 'rgba(0,0,0,0.88)',
            selectorBg: '#ffffff',
            colorBgBase: '#fff',
            colorBgContainer: '#ffffff',
            colorBgContainerDisabled: 'rgba(0,0,0,0.04)',
            colorBgElevated: '#ffffff',
            colorBorder: '#d9d9d9',
            colorError: '#ff4d4f',
            colorErrorBg: '#fff2f0',
            colorErrorBgHover: '#fff1f0',
            colorErrorHover: '#ff7875',
            colorErrorOutline: 'rgba(255,38,5,0.06)',
            colorFillSecondary: 'rgba(0,0,0,0.06)',
            colorFillTertiary: 'rgba(0,0,0,0.04)',
            colorIcon: 'rgba(0,0,0,0.45)',
            colorIconHover: 'rgba(0,0,0,0.88)',
            colorPrimary: '#1677ff',
            colorSplit: 'rgba(5,5,5,0.06)',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextDescription: 'rgba(0,0,0,0.45)',
            colorTextDisabled: 'rgba(0,0,0,0.25)',
            colorTextPlaceholder: 'rgba(0,0,0,0.25)',
            colorTextQuaternary: 'rgba(0,0,0,0.25)',
            colorWarning: '#faad14',
            colorWarningBg: '#fffbe6',
            colorWarningBgHover: '#fff1b8',
            colorWarningHover: '#ffd666',
            colorWarningOutline: 'rgba(255,215,5,0.1)',
          },
          Switch: {
            handleBg: '#fff',
            colorPrimary: '#1677ff',
            colorPrimaryBorder: '#91caff',
            colorPrimaryHover: '#4096ff',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextLightSolid: '#fff',
            colorTextQuaternary: 'rgba(0,0,0,0.25)',
            colorTextTertiary: 'rgba(0,0,0,0.45)',
          },
          Modal: {
            contentBg: '#ffffff',
            footerBg: 'transparent',
            headerBg: '#ffffff',
            titleColor: 'rgba(0,0,0,0.88)',
            colorBgMask: 'rgba(0,0,0,0.45)',
            colorBgTextActive: 'rgba(0,0,0,0.15)',
            colorBgTextHover: 'rgba(0,0,0,0.06)',
            colorIcon: 'rgba(0,0,0,0.45)',
            colorIconHover: 'rgba(0,0,0,0.88)',
            colorPrimaryBorder: '#91caff',
            colorSplit: 'rgba(5,5,5,0.06)',
            colorText: 'rgba(0,0,0,0.88)',
          },
          Tooltip: {
            colorBgSpotlight: 'rgba(0,0,0,0.85)',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextLightSolid: '#fff',
          },
          Form: {
            labelColor: 'rgba(0,0,0,0.88)',
            labelRequiredMarkColor: '#ff4d4f',
            colorBorder: '#d9d9d9',
            colorError: '#ff4d4f',
            colorPrimary: '#1677ff',
            colorSuccess: '#52c41a',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextDescription: 'rgba(0,0,0,0.45)',
            colorWarning: '#faad14',
            controlOutline: 'rgba(5,145,255,0.1)',
          },
          Divider: {
            colorSplit: 'rgba(5,5,5,0.06)',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextHeading: 'rgba(0,0,0,0.88)',
          },
          Badge: {
            colorBorderBg: '#ffffff',
            colorError: '#ff4d4f',
            colorErrorHover: '#ff7875',
            colorInfo: '#1677ff',
            colorSuccess: '#52c41a',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextLightSolid: '#fff',
            colorTextPlaceholder: 'rgba(0,0,0,0.25)',
            colorWarning: '#faad14',
          },
          Collapse: {
            contentBg: '#ffffff',
            headerBg: 'rgba(0,0,0,0.02)',
            colorBorder: '#d9d9d9',
            colorPrimaryBorder: '#91caff',
            colorText: 'rgba(0,0,0,0.88)',
            colorTextDisabled: 'rgba(0,0,0,0.25)',
            colorTextHeading: 'rgba(0,0,0,0.88)',
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
