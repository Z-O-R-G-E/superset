import { Dispatch, FC, SetStateAction, useCallback, useEffect } from 'react';
import { t } from '@superset-ui/core';
import { Form, Select, Col, Row, Input, Modal } from 'antd';
import { lowerCase, isNil } from 'lodash';
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
  const uploadFields = useUploadFields();
  const updateUploadFields = useUpdateUploadFields();
  const { isOpen, editFieldIndex } = uploadFieldsSettingsState;

  const [form] = Form.useForm();

  const onClose = useCallback(() => {
    setUploadFieldsSettingsState({
      isOpen: false,
      editFieldIndex: null,
    });
  }, [setUploadFieldsSettingsState]);

  const validateColumnName = useCallback(
    (_: unknown, value: string) => {
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

  const addField = useCallback(
    (newField: UploadFieldType) => {
      updateUploadFields([
        ...uploadFields,
        { ...newField, name: lowerCase(newField.name) },
      ]);
    },
    [uploadFields, updateUploadFields],
  );

  const modifyField = useCallback(
    (updatedField: UploadFieldType) => {
      updateUploadFields(
        uploadFields.map((field, index) =>
          index === editFieldIndex
            ? {
                ...updatedField,
                name: lowerCase(updatedField.name),
                width: uploadFields[index].width,
              }
            : field,
        ),
      );
    },
    [editFieldIndex, uploadFields, updateUploadFields],
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
      form.resetFields();
      if (!isNil(editFieldIndex)) {
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
              <Input autoComplete="off" allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
