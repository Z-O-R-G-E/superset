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
import { Form, Select, Col, Row, Input, Modal, Tooltip, Switch } from 'antd-v5';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { UploadFieldsSettingsStateType, UploadFieldType } from '../../types';
import {
  MODAL_MARK_BACKDROP_FILLER,
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
import { useColumnsSettings } from '../../contexts/ColumnsSettingsContext';

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
  const { indexColumn } = useColumnsSettings();

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

  const isIndexField = useMemo(
    () =>
      editFieldIndex !== null &&
      uploadFields[editFieldIndex].name === indexColumn,
    [editFieldIndex, indexColumn, uploadFields],
  );

  return (
    <Modal
      styles={{
        mask: {
          backdropFilter: MODAL_MARK_BACKDROP_FILLER,
        },
      }}
      title={modalTitle}
      open={isOpen}
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
          <Col span={6}>
            <Form.Item
              name="isRequired"
              valuePropName="checked"
              style={{ margin: 0 }}
              label={t('Обязательное')}
              tooltip={
                isIndexField
                  ? t(
                      'Редактировать колонку, которая выбрана как индекс, запрещено',
                    )
                  : t('Отметить поле как обязательное для заполнения')
              }
            >
              <Switch
                disabled={isIndexField}
                aria-label={t('Обязательное')}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="type"
              label={t('Тип поля')}
              tooltip={
                isIndexField
                  ? t(
                      'Редактировать колонку, которая выбрана как индекс, запрещено',
                    )
                  : t('Выберите тип данных для поля')
              }
              rules={[{ required: true, message: t('Тип поля обязателен') }]}
            >
              <Select
                placeholder={t('Выберите тип')}
                disabled={isIndexField}
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
            <Col span={6}>
              <Form.Item
                name="size"
                label={t('Размер')}
                tooltip={
                  isIndexField
                    ? t(
                        'Редактировать колонку, которая выбрана как индекс, запрещено',
                      )
                    : t('Максимальный размер/длина для типа поля')
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
                <Input disabled={isIndexField} autoComplete="off" />
              </Form.Item>
            </Col>
          )}

          {showPrecisionScaleFields && (
            <>
              <Col span={6}>
                <Form.Item
                  name="precision"
                  label={t('Точность')}
                  tooltip={
                    isIndexField
                      ? t(
                          'Редактировать колонку, которая выбрана как индекс, запрещено',
                        )
                      : t('Общее количество цифр (точность)')
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
                  <Input disabled={isIndexField} autoComplete="off" />
                </Form.Item>
              </Col>

              <Col span={6}>
                <Form.Item
                  name="scale"
                  label={t('Масштаб')}
                  tooltip={
                    isIndexField
                      ? t(
                          'Редактировать колонку, которая выбрана как индекс, запрещено',
                        )
                      : t('Количество цифр после запятой (масштаб)')
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
                  <Input disabled={isIndexField} autoComplete="off" />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item
              name="name"
              label={t('Наименование поля')}
              tooltip={
                isIndexField
                  ? t(
                      'Редактировать колонку, которая выбрана как индекс, запрещено',
                    )
                  : t('Уникальное имя поля')
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
                disabled={isIndexField}
                placeholder={t('Введите уникальное имя поля')}
                autoComplete="off"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item
              name="description"
              label={t('Описание поля')}
              tooltip={t('Описание поля (none - отключает описание)')}
            >
              <Input
                placeholder={t('Введите описание поля')}
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
