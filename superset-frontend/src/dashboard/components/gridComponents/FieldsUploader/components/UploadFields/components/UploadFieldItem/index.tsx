import { FC, memo, useCallback, useMemo } from 'react';
import { Col, Form, Input, Space, Tooltip } from 'antd-v5';
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { t, useTheme } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { useComponentInfo } from '../../../../contexts/ComponentInfoContext';
import { validateType } from '../../../../validators';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import { SubdType, UploadFieldType } from '../../../../types';
import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';
import { TYPE_DESCRIPTIONS } from '../../../../constants';

type UploadFieldItemProps = Omit<UploadFieldType, 'value'> & {
  index: number;
  subd: SubdType;
  onEdit: (index: number) => void;
};

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({
    index,
    name,
    type,
    isRequired,
    size,
    enumValues,
    subd,
    description,
    precision,
    scale,
    width = GRID_MIN_COLUMN_COUNT,
    onEdit,
  }) => {
    const theme = useTheme();
    const { removeField, onWidthChange } = useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentInfo();
    const { dayFirst } = useColumnsSettings();

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
        <Space direction="vertical" size={1} style={{ display: 'flex' }}>
          <span>
            {!!isRequired && (
              <span style={{ color: theme.colors.error.base, marginRight: 4 }}>
                *
              </span>
            )}
            {t(name)}
            {editMode ? (
              <Tooltip
                title={t(
                  'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
                )}
              >
                <InfoCircleOutlined style={{ marginLeft: 8 }} />
              </Tooltip>
            ) : (
              description?.toLowerCase() !== 'none' && (
                <Tooltip
                  title={t(
                    description?.length > 0
                      ? description
                      : TYPE_DESCRIPTIONS[type],
                  )}
                >
                  <InfoCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              )
            )}
          </span>
          <Space size={5} align="center">
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
              <Form.Item
                name={name}
                label={null}
                style={{ margin: 0, padding: 0 }}
                validateTrigger={['onChange', 'onBlur']}
                required={!!isRequired}
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
                <Input
                  placeholder={type}
                  allowClear
                  disabled={editMode}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </ResizableContainer>
            {editMode && (
              <Space direction="vertical" size={1}>
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
        </Space>
      </Col>
    );
  },
);

export default UploadFieldItem;
