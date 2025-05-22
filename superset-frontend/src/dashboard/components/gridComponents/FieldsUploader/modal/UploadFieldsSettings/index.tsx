import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal, Tooltip } from 'antd';
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

  const onClose = useCallback(() => {
    setUploadFieldsSettingsState({ isOpen: false, editFieldIndex: null });
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
        form.setFieldsValue(uploadFields[editFieldIndex]);
      }
    }
  }, [isOpen, editFieldIndex, form, uploadFields]);

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
