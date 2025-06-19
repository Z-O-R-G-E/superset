import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Row, Typography } from 'antd-v5';
import { getClientErrorObject, SupersetClient, t } from '@superset-ui/core';

import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { UploadFieldsSettings } from '../../modal';
import { UploadFieldsSettingsStateType } from '../../types';

import { useComponentInfo } from '../../contexts/ComponentInfoContext';
import { useDataWarehouse } from '../../contexts/DataWarehouseContext';
import { useUploadFieldsManagement } from './hooks/useUploadFieldsManagement';
import UploadFieldItem from './components/UploadFieldItem';
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  const initialValues = useMemo(() => {
    const initialFields = {};
    uploadFields.forEach(({ name, value }) => {
      initialFields[name] = value;
    });

    return {
      ...initialFields,
    };
  }, [uploadFields]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
    if (editMode) {
      form.resetFields();
    }
  }, [initialValues, form, editMode]);

  const appendFormData = (formData: FormData, data: Record<string, any>) => {
    Object.entries(data).forEach(([key, value]) => {
      if (
        ['indexColumn'].includes(key) &&
        (value === undefined || value === null)
      ) {
        return;
      }

      if (
        typeof value === 'object' &&
        !(value instanceof Blob) &&
        !(value instanceof File)
      ) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
  };

  const handleSubmit = useCallback(() => {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { width, description, ...newField } = field;
        return {
          ...newField,
          value: form.getFieldValue(field.name),
        };
      }),
    };
    const formData = new FormData();
    appendFormData(formData, data);
    setIsLoading(true);
    const endpoint = `/api/v1/database/${database?.value}/fields_upload/`;
    return SupersetClient.post({
      endpoint,
      body: formData,
      headers: { Accept: 'application/json' },
    })
      .then(() => {
        addSuccessToast(t('Data Imported'));
        setIsLoading(false);
        resetUploadFields();
      })
      .catch(response =>
        getClientErrorObject(response).then(error => {
          addDangerToast(error.error || 'Error');
        }),
      )
      .finally(() => {
        setIsLoading(false);
      });
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

  return (
    <Form
      form={form}
      name="fieldsUploaderForm"
      layout="vertical"
      style={{ height: '100%' }}
      onFinish={handleSubmit}
      data-test="dashboard-edit-properties-form"
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '0.5rem',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {editMode && (
          <Row style={{ width: '100%' }}>
            <Col
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                htmlType="button"
                aria-label={t('Добавить поле')}
                style={{ minWidth: '3rem' }}
                onClick={handleAddField}
              >
                <Typography.Text ellipsis>{t('Добавить поле')}</Typography.Text>
              </Button>
            </Col>
          </Row>
        )}

        {!uploadFields.length ? (
          <div
            style={{
              display: 'flex',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
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
            {uploadFields.map(
              (
                {
                  name,
                  isRequired,
                  type,
                  size,
                  enumValues,
                  precision,
                  description,
                  scale,
                  width,
                },
                index,
              ) => (
                <UploadFieldItem
                  key={`${name}-${index}`}
                  index={index}
                  name={name}
                  isRequired={isRequired}
                  type={type}
                  size={size}
                  enumValues={enumValues}
                  subd={subd}
                  description={description}
                  precision={precision}
                  scale={scale}
                  width={width}
                  onEdit={handleEditField}
                />
              ),
            )}
          </Row>
        )}

        {!editMode && uploadFields.length > 0 && (
          <Row style={{ width: '100%' }}>
            <Col
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                htmlType="submit"
                aria-label={t('Загрузить')}
                style={{ minWidth: '3rem' }}
                icon={isLoading ? <LoadingOutlined /> : <UploadOutlined />}
              >
                <Typography.Text ellipsis>{t('Загрузить')}</Typography.Text>
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
