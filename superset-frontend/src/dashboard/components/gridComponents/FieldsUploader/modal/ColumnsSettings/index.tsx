import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { t } from '@superset-ui/core';
import { Col, Form, Modal, Row, Select, Switch, Tooltip } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { ColumnsSettingsType } from '../../types';
import {
  useColumnsSettings,
  useUpdateColumnsSettings,
} from '../../contexts/ColumnsSettingsContext';
import { useUploadFields } from '../../contexts/UploadFieldsContext';
import { Input } from '../../../../../../components/Input';
import { validateLatinNum } from '../../validators';
import { spaceReplace } from '../../utils';
import { validateDuplicateColumnName } from '../UploadFieldsSettings/validator/validateDuplicateColumnName';

interface ColumnSettingsProps {
  isColumnsSettingsOpen: boolean;
  setIsColumnsSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

const nullValuesOptions = [
  {
    value: '""',
    label: 'Empty Strings ""',
  },
  {
    value: 'None',
    label: 'None',
  },
  {
    value: 'nan',
    label: 'nan',
  },
  {
    value: 'null',
    label: 'null',
  },
  {
    value: 'N/A',
    label: 'N/A',
  },
];

export const ColumnsSettings: FC<ColumnSettingsProps> = ({
  isColumnsSettingsOpen,
  setIsColumnsSettingsOpen,
}) => {
  const [form] = Form.useForm();
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();
  const uploadFields = useUploadFields();
  const updateColumnsSettings = useUpdateColumnsSettings();
  const [isDataframeIndex, setIsDataframeIndex] = useState<boolean>();

  const onClose = useCallback(() => {
    setIsColumnsSettingsOpen(false);
  }, [setIsColumnsSettingsOpen]);

  const handleSubmit = useCallback(
    (values: ColumnsSettingsType) => {
      updateColumnsSettings(values);
      onClose();
    },
    [onClose, updateColumnsSettings],
  );

  const handleDataframeIndexChange = (value: boolean) => {
    setIsDataframeIndex(value);
    form.setFieldsValue({
      indexColumn: '',
      indexLabel: '',
    });
  };

  useEffect(() => {
    if (isColumnsSettingsOpen) {
      setIsDataframeIndex(dataframeIndex);
      form.setFieldsValue({
        dayFirst,
        nullValues,
        dataframeIndex,
        indexColumn,
        indexLabel,
      });
    }
  }, [
    form,
    isColumnsSettingsOpen,
    dataframeIndex,
    dayFirst,
    nullValues,
    indexColumn,
    indexLabel,
  ]);

  return (
    <Modal
      title={t('Настройки колонок')}
      visible={isColumnsSettingsOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      centered
      destroyOnClose
      width={700}
      data-test="columns-settings-modal"
    >
      <Form
        name="columnsSettingsForm"
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              label={
                <span>
                  {t('Сначала день')}
                  <Tooltip
                    title={t(
                      'Даты в формате ДД-ММ-ГГГГ, международный и европейский формат',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="dayFirst"
              valuePropName="checked"
              validateFirst
            >
              <Switch
                aria-label={t('Сначала день')}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item
              label={
                <span>
                  {t('NULL значения')}
                  <Tooltip
                    title={t(
                      'Выберите значения, которые следует рассматривать как нулевые. Предупреждение: база данных Hive поддерживает только одно значение',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="nullValues"
              validateFirst
            >
              <Select
                mode="multiple"
                maxTagCount="responsive"
                options={nullValuesOptions}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              label={
                <span>
                  {t('Создать индекс')}
                  <Tooltip title={t('Создать индекс для записи')}>
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              name="dataframeIndex"
              valuePropName="checked"
              validateFirst
            >
              <Switch
                aria-label={t('Создать индекс')}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                onChange={handleDataframeIndexChange}
              />
            </Form.Item>
          </Col>
          {!!isDataframeIndex && (
            <>
              <Col span={6}>
                <Form.Item
                  label={
                    <span>
                      {t('Значение колонки')}
                      <Tooltip
                        title={t(
                          'Сделать индекс для записи из значения колонки. (Колонка должна иметь флаг "Требуется")',
                        )}
                      >
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </span>
                  }
                  name="indexColumn"
                  validateFirst
                >
                  <Select
                    options={uploadFields
                      .filter(({ isRequired }) => isRequired)
                      .map(({ name }) => ({
                        value: name,
                        label: name,
                      }))}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={
                    <span>
                      {t('Метка индекса')}
                      <Tooltip
                        title={t(
                          'Метка для столбца индекса. Не используйте существующее имя столбца',
                        )}
                      >
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </span>
                  }
                  name="indexLabel"
                  rules={[
                    { required: false },
                    {
                      validator: (_, value) =>
                        validateDuplicateColumnName(uploadFields, null)(
                          _,
                          value,
                        ),
                    },
                    { validator: validateLatinNum },
                  ]}
                  validateFirst
                  normalize={value => spaceReplace(value).toLowerCase()}
                >
                  <Input
                    aria-label={t('Индексная метка')}
                    type="text"
                    allowClear
                  />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
};
