import { FC } from 'react';
import {
  Divider,
  Typography,
  ConfigProvider,
  ConfigProviderProps,
} from 'antd-v5';

import { t, useTheme } from '@superset-ui/core';
import { getTheme, ThemeType } from 'src/theme/index';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useHeader } from '../../contexts/HeaderContext';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import { FORM_INPUTS_SHADOW_COLOR } from '../../constants';

const Wrapper: FC<ConfigProviderProps> = ({ theme, children }) => {
  const colorsTheme = useTheme();
  const { database, table, alreadyExists } = useDataWarehouse();
  const { active, label } = useHeader();
  const { editMode } = useComponentInfo();

  const isDatabaseReady = database && alreadyExists && table.length > 0;

  const defaultTheme = getTheme(ThemeType.LIGHT);

  const customTheme = {
    ...defaultTheme,
    components: {
      Button: {
        defaultBg: colorsTheme.colors.grayscale.light4,
      },
      Input: {
        colorBgContainer: colorsTheme.colors.grayscale.light5,
        hoverBorderColor: colorsTheme.colors.primary.base,
        activeBorderColor: colorsTheme.colors.primary.dark1,
        activeShadow: `0 0 0 2px ${FORM_INPUTS_SHADOW_COLOR}`,
      },
      Modal: {
        titleFontSize: 16,
        contentBg: colorsTheme.colors.grayscale.light5,
        footerBg: 'transparent',
        headerBg: colorsTheme.colors.grayscale.light5,
      },
      Select: {
        selectorBg: colorsTheme.colors.grayscale.light5,
        colorBgElevated: colorsTheme.colors.grayscale.light5,
        colorPrimaryHover: colorsTheme.colors.primary.base,
        controlOutline: FORM_INPUTS_SHADOW_COLOR,
        controlOutlineWidth: 2,
      },
    },
  };

  return (
    <ConfigProvider theme={theme || customTheme} prefixCls="antd5">
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
