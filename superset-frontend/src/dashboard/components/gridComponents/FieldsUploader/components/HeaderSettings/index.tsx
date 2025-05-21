import { FC, useCallback } from 'react';
import { Divider, Form, Input, Switch, Tooltip } from 'antd';
import { t } from '@superset-ui/core';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useHeader, useUpdateHeader } from '../../contexts/HeaderContext';

export const HeaderSettings: FC = () => {
  const { active } = useHeader();
  const updateHeader = useUpdateHeader();

  const handleHeaderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateHeader('label', e.target.value);
    },
    [updateHeader],
  );

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      updateHeader('active', checked);
    },
    [updateHeader],
  );

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
      <Divider style={{ margin: 0 }} orientation="left">
        Заголовок
      </Divider>
      <Form.Item style={{ flexGrow: 1, margin: 0 }} name="label">
        <Input
          aria-label={t('Заголовок')}
          onChange={handleHeaderChange}
          disabled={!active}
          autoComplete="off"
          allowClear
        />
      </Form.Item>
      <Form.Item style={{ margin: 0 }} name="active">
        <Tooltip title={t('Вкл/Выкл отображение заголовка"')}>
          <Switch
            aria-label={t('Переключатель')}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            checked={active}
            onChange={handleSwitchChange}
          />
        </Tooltip>
      </Form.Item>
    </div>
  );
};
