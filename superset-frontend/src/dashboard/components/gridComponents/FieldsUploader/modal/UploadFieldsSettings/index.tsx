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
import { Form, Select, Col, Row, Input, Modal, Tooltip, Space } from 'antd';
import { lowerCase } from 'lodash';
import { InfoCircleOutlined } from '@ant-design/icons';
import { UploadFieldsSettingsStateType, UploadFieldType } from '../../types';
import { FieldTypeOptions, TYPE_DESCRIPTIONS } from '../../constants';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';
import { spaceReplace } from '../../utils/spaceReplace';
import { validateLatinNumNoSpaces } from '../../utils/validators/validateLatinNumNoSpaces';

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
  const { isOpen, editFieldIndex } = uploadFieldsSettingsState;
  const uploadFields = useUploadFields();
  const updateUploadFields = useUpdateUploadFields();
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string | undefined>();

  const onClose = useCallback(() => {
    setUploadFieldsSettingsState({ isOpen: false, editFieldIndex: null });
    setSelectedType(undefined);
  }, [setUploadFieldsSettingsState]);

  const validateDuplicateColumnName = useCallback(
    (_: unknown, value: string) => {
      const processedValue = spaceReplace(value).toLowerCase();
      const isDuplicate = uploadFields.some(
        (field, index) =>
          lowerCase(field.name) === processedValue && index !== editFieldIndex,
      );
      if (isDuplicate)
        return Promise.reject(t('Наименование поля уже существует'));

      return Promise.resolve();
    },
    [uploadFields, editFieldIndex],
  );

  const handleSubmit = useCallback(
    (values: UploadFieldType) => {
      const processedField = {
        ...values,
        name: values.name.replace(/\s+/g, '_').toLowerCase(),
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
    // Сбрасываем дополнительные параметры при изменении типа
    form.setFieldsValue({
      size: undefined,
      precision: undefined,
      scale: undefined,
    });
  };

  const showSizeField =
    selectedType &&
    [
      'CHAR',
      'VARCHAR',
      'NCHAR',
      'NVARCHAR',
      'BINARY',
      'VARBINARY',
      'BIT',
    ].includes(selectedType);
  const showPrecisionField =
    selectedType && ['DECIMAL', 'NUMERIC'].includes(selectedType);
  const showScaleField =
    selectedType && ['DECIMAL', 'NUMERIC'].includes(selectedType);

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
        <Row gutter={16}>
          <Col span={10}>
            <Space size="small" direction="vertical" style={{ width: '100%' }}>
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
                  optionLabelProp="label"
                  onChange={handleTypeChange}
                >
                  {FieldTypeOptions.map(group => (
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

              {showSizeField && (
                <Form.Item
                  name="size"
                  label={
                    <Tooltip
                      title={t('Максимальный размер/длина для типа поля')}
                    >
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
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              )}

              {showPrecisionField && (
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
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              )}

              {showScaleField && (
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
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Space>
          </Col>
          <Col span={14}>
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
                { validator: validateLatinNumNoSpaces },
                { validator: validateDuplicateColumnName },
              ]}
              validateFirst
              normalize={value => value?.replace(/\s+/g, '_').toLowerCase()}
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
