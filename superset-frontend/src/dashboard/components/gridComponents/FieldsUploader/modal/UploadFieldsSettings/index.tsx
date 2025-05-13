import { FC, useCallback, useEffect } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal } from 'antd';
import { lowerCase, isNil } from 'lodash';
import { UploadFieldType } from '../../types';
import { useUploadInfoController } from '../../contexts/UploadInfoContext';

const FieldTypeOptions = [
  { value: 'INT', label: 'INT' },
  { value: 'STRING', label: 'STRING' },
  { value: 'FLOAT', label: 'FLOAT' },
];

export const UploadFieldsSettings: FC = () => {
  const {
    fieldsState,
    setFieldsState,
    uploadFieldsSettingsState,
    setUploadFieldsSettingsState,
  } = useUploadInfoController();
  const { isOpen, editFieldIndex } = uploadFieldsSettingsState;

  const [form] = Form.useForm();

  const onClose = useCallback(() => {
    form.resetFields();
    setUploadFieldsSettingsState({
      isOpen: false,
      editFieldIndex: null,
    });
  }, [form, setUploadFieldsSettingsState]);

  const validateColumnName = useCallback(
    (_: unknown, value: string) => {
      const isDuplicate = fieldsState.some(
        (field, index) =>
          lowerCase(field.name) === lowerCase(value) &&
          index !== editFieldIndex,
      );

      if (isDuplicate) {
        return Promise.reject(t('Наименование поля уже существует'));
      }

      return Promise.resolve();
    },
    [fieldsState, editFieldIndex],
  );

  const addField = useCallback(
    (newField: UploadFieldType) => {
      setFieldsState(prev => [
        ...prev,
        { ...newField, name: lowerCase(newField.name) },
      ]);
    },
    [setFieldsState],
  );

  const modifyField = useCallback(
    (updatedField: UploadFieldType) => {
      setFieldsState(prev =>
        prev.map((field, index) =>
          index === editFieldIndex
            ? {
                ...updatedField,
                name: lowerCase(updatedField.name),
                width: prev[index].width,
              }
            : field,
        ),
      );
    },
    [editFieldIndex, setFieldsState],
  );

  const handleSubmit = useCallback(
    (values: UploadFieldType) => {
      if (!isNil(editFieldIndex)) {
        modifyField(values);
      } else {
        addField(values);
      }
      onClose();
    },
    [editFieldIndex, modifyField, addField, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue(
        !isNil(editFieldIndex) ? fieldsState[editFieldIndex] : {},
      );
    }
  }, [editFieldIndex, isOpen, form, fieldsState]);

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
      <Form
        name="uploadFieldsSettingsForm"
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      >
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item
              name="type"
              label={t('Тип поля')}
              rules={[{ required: true, message: t('Тип поля обязателен') }]}
            >
              <Select
                options={FieldTypeOptions}
                placeholder={t('Выберите тип поля')}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="name"
              label={t('Наименование поля')}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t('Наименование поля обязательно'),
                },
                { validator: validateColumnName },
              ]}
            >
              <Input allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
