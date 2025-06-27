import { FC, memo, useMemo } from 'react';
import { Col, Space } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import {
  UploadFieldConfigType,
  UploadFieldFormatType,
  UploadFieldLayoutType,
} from '../../../../types';
import { useComponentState } from '../../../../contexts/ComponentStateContext';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { TYPE_DESCRIPTIONS } from '../../../../constants';
import { createField } from './FieldComponents/FieldFactory';
import { Empty } from './FieldComponents/Empty';
import { useUploadFieldDnD } from './hooks/useUploadFieldDnD';
import { useUploadFieldResize } from './hooks/useUploadFieldResize';

type UploadFieldProps = {
  index: number;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

export const UploadField: FC<UploadFieldProps> = memo(
  ({ index, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
    const { removeField } = useUploadFieldsManagement();
    const { editMode, widthMultiple } = useComponentState();

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
    const {
      resizing,
      normalizedWidth,
      columnWidth,
      handleResizeStart,
      handleResizeStop,
    } = useUploadFieldResize(index, width);
    const { dragRef, dropRef, isDragging } = useUploadFieldDnD(index, resizing);

    const handleEdit = useMemo(() => () => onEdit(index), [onEdit, index]);
    const handleDelete = useMemo(
      () => () => removeField(index),
      [removeField, index],
    );

    const tooltipContent = useMemo(() => {
      if (!editMode && !hasDescription) return null;

      return (
        <span style={{ whiteSpace: 'pre-line' }}>
          {editMode
            ? t(
                'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край',
              )
            : t(description || TYPE_DESCRIPTIONS[type])}
        </span>
      );
    }, [editMode, hasDescription, description, type]);

    const FieldComponent = useMemo(
      () => createField(type) || createField('TEXT'),
      [type],
    );

    return (
      <Col
        ref={node => {
          if (editMode && node) {
            dragRef(dropRef(node));
          }
        }}
        style={{
          opacity: isDragging ? 0 : 1,
          cursor: editMode ? (resizing ? 'col-resize' : 'move') : 'default',
        }}
      >
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
              <FieldComponent
                name={name}
                type={type}
                isRequired={isRequired}
                tooltipContent={tooltipContent}
                size={size}
                precision={precision}
                scale={scale}
                enumValues={enumValues}
                isAutoSize={isAutoSize}
                isMultiple={isMultiple}
                rowCount={rowCount}
                hasCounter={hasCounter}
              />
            ) : (
              <Empty />
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
  (prevProps, nextProps) =>
    prevProps.index === nextProps.index &&
    prevProps.fieldConfig === nextProps.fieldConfig &&
    prevProps.formatOptions === nextProps.formatOptions &&
    prevProps.layoutOptions === nextProps.layoutOptions,
);
