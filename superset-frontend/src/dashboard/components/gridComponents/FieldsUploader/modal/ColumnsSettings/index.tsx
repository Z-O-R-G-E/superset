import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { t } from '@superset-ui/core';
import { Col, Form, Input, Modal, Row, Select, Switch } from 'antd-v5';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { ColumnsSettingsType } from '../../types';
import {
  useColumnsSettings,
  useUpdateColumnsSettings,
} from '../../contexts/ColumnsSettingsContext';
import { useUploadFields } from '../../contexts/UploadFieldsContext';
import { validateLatinNum } from '../../validators';
import { spaceReplace } from '../../utils';
import { validateDuplicateColumnName } from '../UploadFieldsSettings/validator/validateDuplicateColumnName';
import { MODAL_MARK_BACKDROP_FILLER } from '../../constants';

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
      styles={{
        mask: {
          backdropFilter: MODAL_MARK_BACKDROP_FILLER,
        },
      }}
      title={t('Настройки колонок')}
      open={isColumnsSettingsOpen}
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
              label={t('Сначала день')}
              tooltip={t(
                'Даты в формате ДД-ММ-ГГГГ, международный и европейский формат',
              )}
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
              label={t('NULL значения')}
              tooltip={t(
                'Выберите значения, которые следует рассматривать как нулевые. Предупреждение: база данных Hive поддерживает только одно значение',
              )}
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
              label={t('Создать индекс')}
              tooltip={t('Создать индекс для записи')}
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
                  label={t('Колонка')}
                  tooltip={t(
                    'Сделать индекс для записи из значения колонки. (Колонка должна иметь флаг "Требуется")',
                  )}
                  name="indexColumn"
                  validateFirst
                >
                  <Select
                    aria-label={t('Колонка')}
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
                  label={t('Метка')}
                  tooltip={t(
                    'Метка для столбца индекса. Не используйте существующее имя столбца',
                  )}
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
                  <Input aria-label={t('Метка')} type="text" allowClear />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
};
