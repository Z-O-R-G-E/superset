import { ChangeEvent, FC, useCallback, useEffect, useMemo } from 'react';
import { Form, Input, Switch, Tooltip, Row, Col } from 'antd-v5';
import { t } from '@superset-ui/core';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useHeader, useUpdateHeader } from '../../contexts/HeaderContext';

export const HeaderSettings: FC = () => {
  const [form] = Form.useForm();
  const { active, label } = useHeader();
  const updateHeader = useUpdateHeader();

  const initialValues = useMemo(() => ({ active, label }), [active, label]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const handleHeaderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
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
      initialValues={initialValues}
      name="headerSettingsForm"
      layout="vertical"
    >
      <Row align="middle" justify="center" gutter={8}>
        <Col flex="auto">
          <Form.Item name="label">
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
          <Form.Item name="active">
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
