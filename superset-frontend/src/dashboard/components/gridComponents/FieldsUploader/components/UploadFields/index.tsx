import { FC, useCallback, useMemo } from 'react';
import { Row, Typography } from 'antd';
import { throttle } from 'lodash';
import {
  useUploadInfo,
  useUploadInfoController,
} from '../../contexts/UploadInfoContext';
import { UploadFieldItem } from '../UploadFieldItem';

export const UploadFields: FC = () => {
  const { editMode } = useUploadInfo();
  const { fieldsState, setFieldsState, setUploadFieldsSettingsState } =
    useUploadInfoController();

  const throttledSetWidth = useMemo(
    () =>
      throttle((index: number, newWidth: number) => {
        setFieldsState(prev =>
          prev.map((field, i) =>
            i === index ? { ...field, width: newWidth } : field,
          ),
        );
      }, 100),
    [setFieldsState],
  );

  const removeField = useCallback(
    (index: number) => {
      setFieldsState(prev => prev.filter((_, i) => i !== index));
    },
    [setFieldsState],
  );

  const editField = useCallback(
    (index: number) => {
      setUploadFieldsSettingsState({
        isOpen: true,
        editFieldIndex: index,
      });
    },
    [setUploadFieldsSettingsState],
  );

  const renderFields = useMemo(() => {
    if (!fieldsState.length) {
      return (
        <Typography.Text type="secondary">
          ( Ни одно поле не добавлено )
        </Typography.Text>
      );
    }

    return (
      <Row justify="center" gutter={[16, 8]}>
        {fieldsState.map((field, index) => (
          <UploadFieldItem
            key={`${field.name}-${index}`}
            index={index}
            name={field.name}
            type={field.type}
            width={field.width}
            editMode={editMode}
            onRemove={removeField}
            onEdit={editField}
            onResize={throttledSetWidth}
          />
        ))}
      </Row>
    );
  }, [fieldsState, editMode, removeField, editField, throttledSetWidth]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <Typography.Title style={{ alignSelf: 'flex-start' }} level={5}>
        Поля для загрузки
      </Typography.Title>
      {renderFields}
    </div>
  );
};
