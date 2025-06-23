import { FC, memo, useCallback, useMemo } from 'react';
import { Col, Form, Input, Space, Tooltip, Typography } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t, useTheme } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { validateType } from '../../../../validators';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import {
  SubdType,
  UploadFieldConfigType,
  UploadFieldFormatType,
  UploadFieldLayoutType,
} from '../../../../types';
import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';
import { TYPE_DESCRIPTIONS } from '../../../../constants';
import { useComponentState } from '../../../../contexts/ComponentStateContext';

type UploadFieldProps = {
  index: number;
  subd: SubdType;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

const UploadField: FC<UploadFieldProps> = memo(
  ({ index, subd, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
    const theme = useTheme();
    const { name, type, isRequired } = fieldConfig;
    const { size, enumValues, precision, scale } = formatOptions;
    const {
      isMultiple,
      isField,
      description,
      hasDescription,
      isAutoSize,
      hasCounter,
      rowCount,
      width = GRID_MIN_COLUMN_COUNT,
    } = layoutOptions;
    const { removeField, onWidthChange } = useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentState();
    const { dayFirst } = useColumnsSettings();

    const defaultTypeDescription = useMemo(
      () => TYPE_DESCRIPTIONS[type],
      [type],
    );

    const normalizedWidth = useMemo(
      () => Math.min(Math.max(width, GRID_MIN_COLUMN_COUNT), widthMultiple - 1),
      [width, widthMultiple],
    );

    const handleResizeStart = useCallback(() => {
      setDisableDragDrop(true);
    }, [setDisableDragDrop]);

    const handleResizeStop = useCallback(
      ({ widthMultiple: newWidthRaw }: { widthMultiple: number }) => {
        const newWidth = Math.min(newWidthRaw, widthMultiple - 1);
        if (newWidth !== width) {
          onWidthChange(index, newWidth);
        }
        setDisableDragDrop(false);
      },
      [index, onWidthChange, setDisableDragDrop, widthMultiple, width],
    );

    const handleEdit = useCallback(() => onEdit(index), [onEdit, index]);
    const handleDelete = useCallback(
      () => removeField(index),
      [removeField, index],
    );

    return (
      <Col>
        <Space
          style={{ display: 'flex', alignItems: 'stretch' }}
          size={5}
          align="start"
        >
          <ResizableContainer
            id={`upload-field-item-${index}`}
            adjustableWidth
            adjustableHeight={false}
            widthStep={columnWidth}
            minWidthMultiple={GRID_MIN_COLUMN_COUNT}
            maxWidthMultiple={widthMultiple - 1}
            widthMultiple={normalizedWidth}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            editMode={editMode}
          >
            {isField ? (
              <>
                <Form.Item
                  style={{ margin: 0 }}
                  labelCol={{ style: { paddingBottom: 0 } }}
                  wrapperCol={{ style: { paddingTop: 0 } }}
                  name={name}
                  label={t(name)}
                  tooltip={
                    editMode
                      ? t(
                          'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
                        )
                      : hasDescription && (
                          <span style={{ whiteSpace: 'pre-line' }}>
                            {t(
                              description?.length > 0
                                ? description
                                : defaultTypeDescription,
                            )}
                          </span>
                        )
                  }
                  validateTrigger={['onChange', 'onBlur']}
                  required={isRequired}
                  rules={[
                    {
                      required: !!isRequired,
                      message: 'Поле обязательно для заполнения',
                    },
                    {
                      validator: (_, value) =>
                        validateType(type, subd, dayFirst, {
                          size,
                          enumValues,
                          precision,
                          scale,
                        })(_, value),
                    },
                  ]}
                >
                  {isMultiple ? (
                    <Input.TextArea
                      placeholder={type}
                      allowClear
                      disabled={editMode}
                      autoSize={
                        isAutoSize
                          ? { minRows: 1, maxRows: rowCount }
                          : { minRows: rowCount, maxRows: rowCount }
                      }
                      style={{ width: '100%' }}
                      count={{
                        show: hasCounter,
                        max: size,
                      }}
                    />
                  ) : (
                    <Input
                      placeholder={type}
                      allowClear
                      disabled={editMode}
                      style={{ width: '100%' }}
                      count={{
                        show: hasCounter,
                        max: size,
                      }}
                    />
                  )}
                </Form.Item>
              </>
            ) : (
              <Tooltip
                title={
                  editMode
                    ? t(
                        'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
                      )
                    : ''
                }
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: editMode
                      ? `0.3rem dashed ${theme.colors.grayscale.base}`
                      : 0,
                    color: theme.colors.grayscale.base,
                    marginTop: '1.6rem',
                    width: 'inherit',
                    height: '2rem',
                  }}
                >
                  {editMode ? (
                    <Typography.Text style={{ color: 'inherit' }} ellipsis>
                      {t('Вставка')}
                    </Typography.Text>
                  ) : (
                    ''
                  )}
                </div>
              </Tooltip>
            )}
          </ResizableContainer>
          {editMode && (
            <Space
              style={{ position: 'relative', top: '1em' }}
              direction="vertical"
              size={1}
            >
              <EditOutlined
                onClick={handleEdit}
                aria-label={t('Редактировать поле')}
              />
              <DeleteOutlined
                onClick={handleDelete}
                aria-label={t('Удалить поле')}
              />
            </Space>
          )}
        </Space>
      </Col>
    );
  },
);

export default UploadField;
