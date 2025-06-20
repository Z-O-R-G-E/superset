import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Row, Typography } from 'antd-v5';
import { getClientErrorObject, SupersetClient, t } from '@superset-ui/core';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';
import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useUploadFieldsManagement } from './hooks/useUploadFieldsManagement';
import UploadField from './components/UploadField';
import withToasts from '../../../../../../components/MessageToasts/withToasts';
import { useColumnsSettings } from '../../contexts/ColumnsSettingsContext';

interface UploadFieldsProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

const UploadFields: FC<UploadFieldsProps> = ({
  addDangerToast,
  addSuccessToast,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();
  const [settingsState, setSettingsState] =
    useState<UploadFieldsSettingsStateType>({
      isOpen: false,
      editFieldIndex: null,
    });

  const { database, schema, table, alreadyExists, subd } = useDataWarehouse();
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();
  const { editMode } = useComponentInfo();
  const { uploadFields, resetUploadFields } = useUploadFieldsManagement();

  const initialValues = useMemo(
    () =>
      uploadFields.reduce(
        (acc, { name, value }) => {
          acc[name] = value;
          return acc;
        },
        {} as Record<string, any>,
      ),
    [uploadFields],
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
    if (editMode) {
      form.resetFields();
    }
  }, [initialValues, form, editMode]);

  const appendFormData = useCallback(
    (formData: FormData, data: Record<string, any>) => {
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'indexColumn' && value == null) return;

        if (
          typeof value === 'object' &&
          !(value instanceof Blob) &&
          !(value instanceof File)
        ) {
          formData.append(key, JSON.stringify(value));
        } else if (value != null) {
          formData.append(key, value);
        }
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const data = {
      schema: schema?.value,
      table,
      alreadyExists,
      dayFirst,
      nullValues,
      dataframeIndex,
      indexColumn,
      indexLabel,
      uploadFields: uploadFields.map(field => {
        const {
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
          ...newField
        } = field;
        return {
          ...newField,
          value: form.getFieldValue(field.name),
        };
      }),
    };

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
      addSuccessToast(t('Data Imported'));
      resetUploadFields();
    } catch (response) {
      const error = await getClientErrorObject(response);
      addDangerToast(error.error || 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [
    uploadFields,
    schema?.value,
    table,
    alreadyExists,
    dayFirst,
    nullValues,
    dataframeIndex,
    indexColumn,
    indexLabel,
    database?.value,
    form,
    addSuccessToast,
    resetUploadFields,
    addDangerToast,
    appendFormData,
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

  const containerStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    justifyContent: 'flex-start',
    alignItems: 'center',
  };

  const emptyStateStyle = {
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const buttonContainerStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  };

  return (
    <Form
      form={form}
      name="fieldsUploaderForm"
      layout="vertical"
      style={{ height: '100%' }}
      onFinish={handleSubmit}
      data-test="dashboard-edit-properties-form"
    >
      <div style={containerStyle}>
        {editMode && (
          <Row style={{ width: '100%' }}>
            <Col style={buttonContainerStyle}>
              <Button
                htmlType="button"
                aria-label={t('Добавить поле')}
                style={{ minWidth: '3rem' }}
                onClick={handleAddField}
              >
                <Typography.Text style={{ color: 'inherit' }} ellipsis>
                  {t('Добавить поле')}
                </Typography.Text>
              </Button>
            </Col>
          </Row>
        )}

        {!uploadFields.length ? (
          <div style={emptyStateStyle}>
            <Typography.Text
              ellipsis
              style={{ textAlign: 'center' }}
              type="secondary"
            >
              {editMode
                ? t('( Ни одно поле не добавлено. )')
                : t(
                    'Ни одно поле не добавлено. Для добавления полей перейдите в режим редактирования дэшборда.',
                  )}
            </Typography.Text>
          </div>
        ) : (
          <Row justify="center" gutter={[16, 8]} style={{ marginBottom: 16 }}>
            {uploadFields.map((field, index) => (
              <UploadField
                key={`${field.name}-${index}`}
                index={index}
                subd={subd}
                fieldConfig={{
                  name: field.name,
                  isRequired: field.isRequired,
                  isMultiple: field.isMultiple,
                  type: field.type,
                  description: field.description,
                }}
                formatOptions={{
                  precision: field.precision,
                  scale: field.scale,
                  size: field.size,
                  enumValues: field.enumValues,
                }}
                layoutOptions={{
                  width: field.width,
                  isAutoSize: field.isAutoSize,
                  rowCount: field.rowCount,
                  hasCounter: field.hasCounter,
                }}
                onEdit={handleEditField}
              />
            ))}
          </Row>
        )}

        {!editMode && uploadFields.length > 0 && (
          <Row style={{ width: '100%' }}>
            <Col style={buttonContainerStyle}>
              <Button
                htmlType="submit"
                aria-label={t('Загрузить')}
                style={{ minWidth: '3rem' }}
                icon={isLoading ? <LoadingOutlined /> : <UploadOutlined />}
              >
                <Typography.Text style={{ color: 'inherit' }} ellipsis>
                  {t('Загрузить')}
                </Typography.Text>
              </Button>
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
};

export default withToasts(UploadFields);
