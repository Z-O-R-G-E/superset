import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal, Tooltip, Switch } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { UploadFieldsSettingsStateType, UploadFieldType } from '../../types';
import {
  PRECISION_SCALE_DEPENDENT_TYPES,
  SIZE_DEPENDENT_TYPES,
  TYPE_DESCRIPTIONS,
} from '../../constants';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';
import { spaceReplace, getFilteredFieldTypeOptions } from '../../utils';
import { validateLatinNum } from '../../validators';
import { validateDuplicateColumnName } from './validator/validateDuplicateColumnName';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';

const { OptGroup, Option } = Select;

interface UploadFieldsSettingsProps {
  uploadFieldsSettingsState: UploadFieldsSettingsStateType;
  setUploadFieldsSettingsState: Dispatch<
    SetStateAction<UploadFieldsSettingsStateType>
  >;
}

export const UploadFieldsSettings: FC<UploadFieldsSettingsProps> = ({
  uploadFieldsSettingsState,
  setUploadFieldsSettingsState,
}) => {
  const [form] = Form.useForm();
  const { isOpen, editFieldIndex } = uploadFieldsSettingsState;
  const uploadFields = useUploadFields();
  const updateUploadFields = useUpdateUploadFields();
  const [selectedType, setSelectedType] = useState<string>();
  const { subd } = useDataWarehouse();

  const onClose = useCallback(() => {
    setUploadFieldsSettingsState({ isOpen: false, editFieldIndex: null });
    setSelectedType(undefined);
  }, [setUploadFieldsSettingsState]);

  const handleSubmit = useCallback(
    (values: UploadFieldType) => {
      const processedField = {
        ...values,
        name: spaceReplace(values.name).toLowerCase(),
        ...(editFieldIndex !== null && {
          width: uploadFields[editFieldIndex].width,
        }),
      };

      const updatedFields =
        editFieldIndex !== null
          ? uploadFields.map((field, index) =>
              index === editFieldIndex ? processedField : field,
            )
          : [...uploadFields, processedField];

      updateUploadFields(updatedFields);
      onClose();
    },
    [editFieldIndex, uploadFields, updateUploadFields, onClose],
  );

  const modalTitle = useMemo(
    () => t(editFieldIndex !== null ? 'Редактировать поле' : 'Добавить поле'),
    [editFieldIndex],
  );

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      if (editFieldIndex !== null) {
        const field = uploadFields[editFieldIndex];
        form.setFieldsValue(field);
        setSelectedType(field.type);
      }
    }
  }, [isOpen, editFieldIndex, form, uploadFields]);

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setFieldsValue({
      size: undefined,
      precision: undefined,
      scale: undefined,
    });
  };

  const filteredFieldTypeOptions = useMemo(
    () => getFilteredFieldTypeOptions(subd),
    [subd],
  );

  const showSizeField =
    selectedType && SIZE_DEPENDENT_TYPES.includes(selectedType);
  const showPrecisionScaleFields =
    selectedType && PRECISION_SCALE_DEPENDENT_TYPES.includes(selectedType);

  return (
    <Modal
      title={modalTitle}
      visible={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      width={700}
      centered
      destroyOnClose
      data-test="upload-fields-settings-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16} align="top">
          <Col>
            <Form.Item
              name="isRequired"
              valuePropName="checked"
              style={{ margin: 0 }}
              label={
                <Tooltip title={t('Поле обязательно для заполнения')}>
                  <span>
                    {t('Требуется')}
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </span>
                </Tooltip>
              }
            >
              <Switch
                aria-label={t('Обязательно для заполнения')}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
          <Col flex="220px">
            <Form.Item
              name="type"
              label={
                <Tooltip title={t('Выберите тип данных для поля')}>
                  <span>
                    {t('Тип поля')}
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </span>
                </Tooltip>
              }
              rules={[{ required: true, message: t('Тип поля обязателен') }]}
            >
              <Select
                placeholder={t('Выберите тип')}
                allowClear
                showSearch
                optionLabelProp="label"
                onChange={handleTypeChange}
                style={{ width: '100%' }}
              >
                {filteredFieldTypeOptions.map(group => (
                  <OptGroup key={group.label} label={group.label}>
                    {group.options.map(option => (
                      <Option
                        key={option.value}
                        value={option.value}
                        label={option.label}
                      >
                        <Tooltip
                          title={
                            TYPE_DESCRIPTIONS[option.value] ||
                            'Описание отсутствует'
                          }
                          placement="right"
                          overlayStyle={{ maxWidth: 400 }}
                        >
                          <span>{option.label}</span>
                        </Tooltip>
                      </Option>
                    ))}
                  </OptGroup>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {showSizeField && (
            <Col flex="120px">
              <Form.Item
                name="size"
                label={
                  <Tooltip title={t('Максимальный размер/длина для типа поля')}>
                    <span>
                      {t('Размер')}
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </span>
                  </Tooltip>
                }
                rules={[
                  {
                    required: true,
                    message: t('Размер для типа поля обязателен'),
                  },
                  {
                    pattern: /^[1-9]\d*$/,
                    message: t('Должно быть положительным целым числом'),
                  },
                ]}
              >
                <Input autoComplete="off" />
              </Form.Item>
            </Col>
          )}

          {showPrecisionScaleFields && (
            <>
              <Col flex="120px">
                <Form.Item
                  name="precision"
                  label={
                    <Tooltip title={t('Общее количество цифр (точность)')}>
                      <span>
                        {t('Точность')}
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </span>
                    </Tooltip>
                  }
                  rules={[
                    {
                      required: true,
                      message: t('Точность обязательна для DECIMAL/NUMERIC'),
                    },
                    {
                      pattern: /^[1-9]\d*$/,
                      message: t('Должно быть положительным целым числом'),
                    },
                  ]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>

              <Col flex="120px">
                <Form.Item
                  name="scale"
                  label={
                    <Tooltip
                      title={t('Количество цифр после запятой (масштаб)')}
                    >
                      <span>
                        {t('Масштаб')}
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </span>
                    </Tooltip>
                  }
                  rules={[
                    {
                      required: true,
                      message: t('Масштаб обязателен для DECIMAL/NUMERIC'),
                    },
                    {
                      pattern: /^\d+$/,
                      message: t('Должно быть неотрицательным целым числом'),
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const precision = getFieldValue('precision');
                        if (
                          precision &&
                          value &&
                          Number(value) > Number(precision)
                        ) {
                          return Promise.reject(
                            t('Масштаб не может превышать точность'),
                          );
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item
              name="name"
              label={
                <Tooltip title={t('Уникальное имя поля')}>
                  <span>
                    {t('Наименование поля')}
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </span>
                </Tooltip>
              }
              rules={[
                { required: true, message: t('Наименование поля обязательно') },
                {
                  validator: (_, value) =>
                    validateDuplicateColumnName(uploadFields, editFieldIndex)(
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
                placeholder={t('Введите уникальное имя поля')}
                autoComplete="off"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
