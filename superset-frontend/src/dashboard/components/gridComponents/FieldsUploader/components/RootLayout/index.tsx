import { FC } from 'react';
import {
  Divider,
  Typography,
  ConfigProvider,
  ConfigProviderProps,
} from 'antd-v5';

import { t, useTheme } from '@superset-ui/core';
import { getTheme, ThemeType } from 'src/theme/index';
import { useSelector } from 'react-redux';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useHeader } from '../../contexts/HeaderContext';
import {
  COLOR_PRIMARY_HOVER,
  FORM_INPUTS_SHADOW_COLOR,
  MODAL_MARK_BACKGROUND_COLOR,
} from '../../constants';
import { useComponentState } from '../../contexts/ComponentStateContext';
import { UserWithPermissionsAndRoles } from '../../../../../../types/bootstrapTypes';
import { isUserAdmin } from '../../../../../util/permissionUtils';
import { findPermission } from '../../../../../../utils/findPermission';

export const RootLayout: FC<ConfigProviderProps> = ({ theme, children }) => {
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const userValues = user || {};
  const { roles } = userValues;
  const isAdmin = isUserAdmin(user);
  const allowUploads = findPermission('can_fields_upload', 'Database', roles);
  const showUploads = allowUploads || isAdmin;

  const colorsTheme = useTheme();
  const { database, table, alreadyExists } = useDataWarehouse();
  const { active, label } = useHeader();
  const { editMode } = useComponentState();

  const isDatabaseReady = database && alreadyExists && table.length > 0;

  const defaultTheme = getTheme(ThemeType.LIGHT);

  const customTheme = {
    ...defaultTheme,
    token: {
      colorPrimaryHover: COLOR_PRIMARY_HOVER,
    },
    components: {
      Button: {
        defaultBg: colorsTheme.colors.grayscale.light4,
      },
      Input: {
        colorBgContainer: colorsTheme.colors.grayscale.light5,
        hoverBorderColor: COLOR_PRIMARY_HOVER,
        activeShadow: `0 0 0 2px ${FORM_INPUTS_SHADOW_COLOR}`,
      },
      Select: {
        selectorBg: colorsTheme.colors.grayscale.light5,
        colorBgElevated: colorsTheme.colors.grayscale.light5,
        controlOutline: FORM_INPUTS_SHADOW_COLOR,
        controlOutlineWidth: 2,
      },
      Modal: {
        titleFontSize: 16,
        contentBg: colorsTheme.colors.grayscale.light5,
        footerBg: 'transparent',
        headerBg: colorsTheme.colors.grayscale.light5,
        colorBgMask: MODAL_MARK_BACKGROUND_COLOR,
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
        {showUploads ? (
          editMode || isDatabaseReady ? (
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
          )
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
              {t('У пользователя нет прав для загрузки данных в БД.')}
            </Typography.Text>
          </div>
        )}
      </div>
    </ConfigProvider>
  );
};
