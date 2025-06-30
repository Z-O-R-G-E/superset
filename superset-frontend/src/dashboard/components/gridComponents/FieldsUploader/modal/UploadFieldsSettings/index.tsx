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
import {
  DataType,
  UploadFieldsSettingsStateType,
  UploadFieldType,
} from '../../types';
import {
  MODAL_MARK_BACKDROP_FILLER,
  MULTIPLE_STRING_DEPENDENT_TYPES,
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
  const [isField, setIsField] = useState<boolean>();
  const [selectedType, setSelectedType] = useState<DataType>();
  const [isMultiple, setIsMultiple] = useState<boolean>();
  const [hasDescription, setHasDescription] = useState<boolean>();
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
        name: values.isField
          ? spaceReplace(values.name).toLowerCase()
          : '_blank',
        index:
          editFieldIndex !== null
            ? uploadFields[editFieldIndex].index
            : uploadFields.length,
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

  const handleIsMultipleChange = (value: boolean) => {
    setIsMultiple(value);
    form.setFieldsValue({
      isAutoSize: false,
      rowCount: '',
    });
  };

  const handleIsFieldChange = (value: boolean) => {
    setIsField(value);
    form.setFieldsValue({
      name: '',
    });
  };

  const handleHasDescriptionChange = (value: boolean) => {
    setHasDescription(value);
    form.setFieldsValue({
      description: '',
    });
  };

  const modalTitle = useMemo(
    () =>
      t(
        editFieldIndex !== null
          ? `Редактировать ${isField ? 'поле' : 'пустышку'}`
          : `Добавить ${isField ? 'поле' : 'пустышку'}`,
      ),
    [editFieldIndex, isField],
  );

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      form.setFieldsValue({
        isField: true,
        isMultiple: false,
        hasDescription: false,
      });
      setIsField(true);
      setIsMultiple(false);
      setHasDescription(false);
      if (editFieldIndex !== null) {
        const field = uploadFields[editFieldIndex];
        form.setFieldsValue(field);
        setIsField(field.isField);
        setSelectedType(field.type);
        setIsMultiple(field.isMultiple);
        setHasDescription(field.hasDescription);
      }
    }
  }, [isOpen, editFieldIndex, form, uploadFields]);

  const handleTypeChange = (value: DataType) => {
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

  const showSizeField = useMemo(
    () => selectedType && SIZE_DEPENDENT_TYPES.includes(selectedType),
    [selectedType],
  );
  const showPrecisionScaleFields = useMemo(
    () =>
      selectedType && PRECISION_SCALE_DEPENDENT_TYPES.includes(selectedType),
    [selectedType],
  );
  const showMultipleFields = useMemo(
    () =>
      selectedType && MULTIPLE_STRING_DEPENDENT_TYPES.includes(selectedType),
    [selectedType],
  );

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
        <Row>
          <Col span={6}>
            <Form.Item
              label={isIndexField && ' '}
              tooltip={
                isIndexField &&
                t(
                  'Редактировать колонку, которая выбрана как индекс, запрещено',
                )
              }
              layout="horizontal"
              name="isField"
              valuePropName="checked"
            >
              <Switch
                disabled={isIndexField}
                aria-label={t('Поле/Пустышка')}
                checkedChildren={t('Поле')}
                unCheckedChildren={t('Пустышка')}
                onChange={handleIsFieldChange}
              />
            </Form.Item>
          </Col>
        </Row>
        {isField && (
          <>
            <Row gutter={16} align="top">
              <Col span={6}>
                <Form.Item
                  name="isRequired"
                  valuePropName="checked"
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
                      : !subd
                        ? t('Сначала необходимо выбрать базу данных')
                        : t('Выберите тип данных для поля')
                  }
                  rules={[
                    { required: true, message: t('Тип поля обязателен') },
                  ]}
                >
                  <Select
                    placeholder={t('Выберите тип')}
                    disabled={isIndexField || !subd}
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
                                (
                                  <span style={{ whiteSpace: 'pre-line' }}>
                                    {t(TYPE_DESCRIPTIONS[option.value])}
                                  </span>
                                ) || t('Описание отсутствует')
                              }
                              placement="right"
                              overlayStyle={{ maxWidth: 400 }}
                            >
                              <span>{t(option.label)}</span>
                            </Tooltip>
                          </Option>
                        ))}
                      </OptGroup>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {showSizeField && (
                <>
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
                  <Col span={6}>
                    <Form.Item
                      name="hasCounter"
                      valuePropName="checked"
                      label={t('Счетчик')}
                      tooltip={t('Вкл/Выкл счетчик символов')}
                    >
                      <Switch
                        aria-label={t('Счетчик')}
                        checkedChildren={<CheckOutlined />}
                        unCheckedChildren={<CloseOutlined />}
                      />
                    </Form.Item>
                  </Col>
                </>
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
                          message: t(
                            'Точность обязательна для DECIMAL/NUMERIC',
                          ),
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
                          message: t(
                            'Должно быть неотрицательным целым числом',
                          ),
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
            {showMultipleFields && (
              <Row>
                <Col span={6}>
                  <Form.Item
                    name="isMultiple"
                    valuePropName="checked"
                    label={t('Многострочность')}
                    tooltip={t('Отметить поле как многострочное')}
                  >
                    <Switch
                      aria-label={t('Многострочность')}
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      onChange={handleIsMultipleChange}
                    />
                  </Form.Item>
                </Col>
                {isMultiple && (
                  <>
                    <Col span={6}>
                      <Form.Item
                        name="isAutoSize"
                        valuePropName="checked"
                        label={t('Авто-размер')}
                        tooltip={t(
                          'Автоматически растягивать поле по высоте до выбранного количества строк',
                        )}
                      >
                        <Switch
                          aria-label={t('Многострочность')}
                          checkedChildren={<CheckOutlined />}
                          unCheckedChildren={<CloseOutlined />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name="rowCount"
                        label={t('Кол-во строк')}
                        tooltip={
                          <span style={{ whiteSpace: 'pre-line' }}>
                            {t(
                              'Количество строк\n(определяет максимальную высоту поля)',
                            )}
                          </span>
                        }
                        rules={[
                          {
                            required: true,
                            message: t('Обязательно для заполнения'),
                          },
                          {
                            pattern: /^[1-9]\d*$/,
                            message: t(
                              'Должно быть положительным целым числом',
                            ),
                          },
                        ]}
                      >
                        <Input autoComplete="off" />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>
            )}
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
                    {
                      required: true,
                      message: t('Наименование поля обязательно'),
                    },
                    {
                      validator: (_, value) =>
                        validateDuplicateColumnName(
                          uploadFields,
                          editFieldIndex,
                        )(_, value),
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
              <Col span={6}>
                <Form.Item
                  name="hasDescription"
                  valuePropName="checked"
                  label={t('Описание')}
                  tooltip={t('Вкл/Выкл описание для поля')}
                >
                  <Switch
                    aria-label={t('Описание')}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    onChange={handleHasDescriptionChange}
                  />
                </Form.Item>
              </Col>

              {hasDescription && (
                <Col span={18}>
                  <Form.Item
                    name="description"
                    label={t('Описание поля')}
                    tooltip={
                      <span style={{ whiteSpace: 'pre-line' }}>
                        {t(
                          'Описание поля\n(Если оставить поле пустым будет использовано описание по умолчанию)',
                        )}
                      </span>
                    }
                  >
                    <Input.TextArea
                      placeholder={t('Введите описание поля')}
                      autoComplete="off"
                      allowClear
                      autoSize={{ minRows: 3, maxRows: 3 }}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
};
