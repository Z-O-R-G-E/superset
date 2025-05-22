import { Dispatch, FC, SetStateAction, useCallback, useEffect } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal, Tooltip } from 'antd';
import { lowerCase } from 'lodash';
import { InfoCircleOutlined } from '@ant-design/icons';
import { UploadFieldsSettingsStateType, UploadFieldType } from '../../types';
import { FieldTypeOptions } from '../../constants';
import {
  useUpdateUploadFields,
  useUploadFields,
} from '../../contexts/UploadFieldsContext';

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

  const validateColumnName = useCallback(
    (_: unknown, value: string) => {
      if (!value) return Promise.reject(t('Наименование поля обязательно'));

      const isDuplicate = uploadFields.some(
        (field, index) =>
          lowerCase(field.name) === lowerCase(value) &&
          index !== editFieldIndex,
      );

      if (isDuplicate) {
        return Promise.reject(t('Наименование поля уже существует'));
      }

      return Promise.resolve();
    },
    [uploadFields, editFieldIndex],
  );

  const handleSubmit = useCallback(
    (values: UploadFieldType) => {
      const processedField = {
        ...values,
        name: lowerCase(values.name),
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
      title={t(
        editFieldIndex !== null ? 'Редактировать поле' : 'Добавить поле',
      )}
      visible={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      centered
      destroyOnClose
      data-test="upload-fields-settings-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="type"
              label={
                <span>
                  {t('Тип поля')}
                  <Tooltip title={t('Выберите тип данных для поля')}>
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: t('Тип поля обязателен') }]}
            >
              <Select
                options={FieldTypeOptions}
                placeholder={t('Выберите тип')}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="name"
              label={
                <span>
                  {t('Наименование поля')}
                  <Tooltip
                    title={t(
                      'Уникальное имя поля (будет приведено к нижнему регистру)',
                    )}
                  >
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              rules={[
                { required: true, message: t('Наименование поля обязательно') },
                {
                  whitespace: true,
                  message: t('Не может состоять из пробелов'),
                },
                { validator: validateColumnName },
              ]}
              validateFirst
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
