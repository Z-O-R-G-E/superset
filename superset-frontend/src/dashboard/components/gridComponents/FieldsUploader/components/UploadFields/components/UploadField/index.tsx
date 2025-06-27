import { FC, memo, useCallback, useMemo, useState } from 'react';
import { Col, Space } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { useDrag, useDrop } from 'react-dnd';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import {
  UploadFieldConfigType,
  UploadFieldFormatType,
  UploadFieldLayoutType,
} from '../../../../types';
import { useComponentState } from '../../../../contexts/ComponentStateContext';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { ItemTypes, TYPE_DESCRIPTIONS } from '../../../../constants';
import { createField } from './FieldComponents/FieldFactory';
import { Empty } from './FieldComponents/Empty';

type UploadFieldProps = {
  index: number;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

interface DragItem {
  name: string;
  originalIndex: number;
  type: string;
}

export const UploadField: FC<UploadFieldProps> = memo(
  ({ index, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
    const [resizing, setResizing] = useState(false);
    const { removeField, onWidthChange, findField, moveField } =
      useUploadFieldsManagement();
    const { editMode, setDisableDragDrop, columnWidth, widthMultiple } =
      useComponentState();

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

    const normalizedWidth = useMemo(
      () =>
        Math.min(
          Math.max(width || GRID_MIN_COLUMN_COUNT, GRID_MIN_COLUMN_COUNT),
          widthMultiple - 1,
        ),
      [width, widthMultiple],
    );

    const handleResizeStart = useCallback(() => {
      setResizing(true);
      setDisableDragDrop(true);
    }, [setDisableDragDrop]);

    const handleResizeStop = useCallback(
      ({ widthMultiple: newWidthRaw }) => {
        const newWidth = Math.min(newWidthRaw, widthMultiple - 1);
        if (newWidth !== width) onWidthChange(index, newWidth);
        setDisableDragDrop(false);
        setResizing(false);
      },
      [index, onWidthChange, setDisableDragDrop, widthMultiple, width],
    );

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

    const originalIndex = useMemo(
      () => findField(name).index,
      [findField, name],
    );

    const [{ isDragging }, drag] = useDrag({
      canDrag: editMode && !resizing,
      item: { name, originalIndex, type: ItemTypes.FIELD },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
      begin: () => setDisableDragDrop(true),
      end: (item: DragItem | undefined, monitor) => {
        if (!item) return;
        const { name: droppedName, originalIndex } = item;
        if (!monitor.didDrop()) {
          moveField(droppedName, originalIndex);
        }
        setDisableDragDrop(false);
      },
    });

    const [, drop] = useDrop({
      accept: ItemTypes.FIELD,
      canDrop: () => editMode,
      hover: ({ name: draggedName }: DragItem) => {
        if (draggedName !== name) {
          const { index: overIndex } = findField(name);
          moveField(draggedName, overIndex);
        }
      },
    });

    return (
      <Col
        ref={node => (editMode ? drag(drop(node)) : null)}
        style={{
          opacity: isDragging ? 0 : 1,
          cursor: resizing ? 'col-resize' : 'move',
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
