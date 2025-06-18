import { FC, useCallback, useEffect } from 'react';
import { Form, Input, Switch, Tooltip, Row, Col } from 'antd-v5';
import { t } from '@superset-ui/core';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useHeader, useUpdateHeader } from '../../contexts/HeaderContext';

export const HeaderSettings: FC = () => {
  const [form] = Form.useForm();
  const { active, label } = useHeader();
  const updateHeader = useUpdateHeader();

  useEffect(() => {
    form.setFieldsValue({ active, label });
  }, [active, label, form]);

  const handleHeaderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateHeader({ active, label: e.target.value });
    },
    [active, updateHeader],
  );

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      updateHeader({
        active: checked,
        label: checked ? label : '',
      });
    },
    [label, updateHeader],
  );

  return (
    <Form
      form={form}
      initialValues={{ active, label }}
      name="headerSettingsForm"
      layout="vertical"
    >
      <Row align="middle" justify="center" gutter={8}>
        <Col flex="auto">
          <Form.Item name="label" style={{ margin: 0 }}>
            <Input
              aria-label={t('Заголовок')}
              onChange={handleHeaderChange}
              disabled={!active}
              autoComplete="off"
              allowClear
            />
          </Form.Item>
        </Col>
        <Col>
          <Form.Item name="active" style={{ margin: 0 }}>
            <Tooltip title={t('Вкл/Выкл отображение заголовка')}>
              <Switch
                aria-label={t('Переключатель')}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                checked={active}
                onChange={handleSwitchChange}
              />
            </Tooltip>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
