import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Col, Form, Row } from 'antd-v5';
import { getClientErrorObject, SupersetClient, t } from '@superset-ui/core';
import { useDrop } from 'react-dnd';
import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';
import withToasts from '../../../../../../components/MessageToasts/withToasts';
import { ItemTypes } from '../../constants';
import {
  AddFieldButton,
  EmptyState,
  SubmitButton,
  FieldsList,
} from './components';
import { useUploadFieldsData } from './hooks/useUploadFieldsData';

interface UploadFieldsProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

interface FormDataAppender {
  (formData: FormData, data: Record<string, any>): void;
}

const containerStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.5rem',
  justifyContent: 'flex-start',
  alignItems: 'center',
};

const buttonContainerStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const isObject = (value: any): boolean =>
  typeof value === 'object' &&
  !(value instanceof Blob) &&
  !(value instanceof File);

const shouldSkip = (key: string, value: any): boolean =>
  (key === 'indexColumn' && value == null) || value == null;

const appendFormData: FormDataAppender = (formData, data) => {
  Object.entries(data).forEach(([key, value]) => {
    if (shouldSkip(key, value)) return;

    formData.append(key, isObject(value) ? JSON.stringify(value) : value);
  });
};

const UploadFields: FC<UploadFieldsProps> = memo(
  ({ addDangerToast, addSuccessToast }) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [settingsState, setSettingsState] =
      useState<UploadFieldsSettingsStateType>({
        isOpen: false,
        editFieldIndex: null,
      });
    const {
      dbms,
      database,
      schema,
      table,
      alreadyExists,
      dayFirst,
      nullValues,
      dataframeIndex,
      indexColumn,
      indexLabel,
      editMode,
      uploadFields,
      resetUploadFields,
    } = useUploadFieldsData();

    const initialValues = useMemo(
      () =>
        uploadFields.reduce(
          (acc, { name, value }) => ({ ...acc, [name]: value }),
          {},
        ),
      [uploadFields],
    );

    const prepareSubmitData = useCallback(() => {
      const fields = uploadFields
        .filter(field => field.isField)
        .map(
          ({
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            width,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            description,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            isMultiple,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            rowCount,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            isAutoSize,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            hasCounter,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            hasDescription,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            isField,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            index,
            ...field
          }) => ({
            ...field,
            value: form.getFieldValue(field.name),
          }),
        );

      return {
        dbms,
        schema: schema?.value,
        table,
        alreadyExists,
        dayFirst,
        nullValues,
        dataframeIndex,
        indexColumn,
        indexLabel,
        uploadFields: fields,
      };
    }, [
      uploadFields,
      form,
      dbms,
      schema?.value,
      table,
      alreadyExists,
      dayFirst,
      nullValues,
      dataframeIndex,
      indexColumn,
      indexLabel,
    ]);

    const handleSubmit = useCallback(async () => {
      const data = prepareSubmitData();
      const formData = new FormData();
      appendFormData(formData, data);
      setIsLoading(true);

      try {
        const endpoint = `/api/v1/database/${database?.value}/fields_upload/`;
        await SupersetClient.post({
          endpoint,
          body: formData,
          headers: { Accept: 'application/json' },
        });
        addSuccessToast(t('Данные загружены'));
        resetUploadFields();
      } catch (response) {
        const error = await getClientErrorObject(response);
        addDangerToast(error.error || 'Error');
      } finally {
        setIsLoading(false);
      }
    }, [
      prepareSubmitData,
      database?.value,
      addSuccessToast,
      resetUploadFields,
      addDangerToast,
    ]);

    const handleAddField = useCallback(
      () => setSettingsState({ isOpen: true, editFieldIndex: null }),
      [],
    );

    const handleEditField = useCallback(
      (index: number) =>
        setSettingsState({ isOpen: true, editFieldIndex: index }),
      [],
    );

    const [, drop] = useDrop({
      accept: ItemTypes.FIELD,
      canDrop: () => editMode,
    });

    useEffect(() => {
      if (editMode) {
        form.resetFields();
      } else {
        form.setFieldsValue(initialValues);
      }
    }, [editMode, initialValues, form]);

    return (
      <Form
        form={form}
        name="fieldsUploaderForm"
        layout="vertical"
        style={{ height: '100%', width: '100%' }}
        onFinish={handleSubmit}
        data-test="dashboard-edit-properties-form"
      >
        <div ref={editMode ? drop : null} style={containerStyle}>
          {editMode && (
            <Row style={{ width: '100%' }}>
              <Col style={buttonContainerStyle}>
                <AddFieldButton onClick={handleAddField} />
              </Col>
            </Row>
          )}

          {!uploadFields.length ? (
            <EmptyState editMode={editMode} />
          ) : (
            <FieldsList fields={uploadFields} onEdit={handleEditField} />
          )}

          {!editMode && uploadFields.length > 0 && (
            <Row style={{ width: '100%' }}>
              <Col style={buttonContainerStyle}>
                <SubmitButton isLoading={isLoading} />
              </Col>
            </Row>
          )}

          <UploadFieldsSettings
            uploadFieldsSettingsState={settingsState}
            setUploadFieldsSettingsState={setSettingsState}
          />
        </div>
      </Form>
    );
  },
);

export default withToasts(UploadFields);
