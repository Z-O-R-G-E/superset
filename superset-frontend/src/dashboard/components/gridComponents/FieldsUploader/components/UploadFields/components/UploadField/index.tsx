import { FC, memo, useCallback, useMemo } from 'react';
import { Col, Space } from 'antd-v5';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../util/constants';
import { useUploadFieldsManagement } from '../../hooks/useUploadFieldsManagement';
import {
  UploadFieldConfigType,
  UploadFieldFormatType,
  UploadFieldLayoutType,
} from '../../../../types';
import { TYPE_DESCRIPTIONS } from '../../../../constants';
import { useComponentState } from '../../../../contexts/ComponentStateContext';
import { Empty, InputText, InputTextArea } from './items';

type UploadFieldProps = {
  index: number;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

export const UploadField: FC<UploadFieldProps> = memo(
  ({ index, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
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

    const defaultTypeDescription = TYPE_DESCRIPTIONS[type];

    const normalizedWidth = useMemo(
      () => Math.min(Math.max(width, GRID_MIN_COLUMN_COUNT), widthMultiple - 1),
      [width, widthMultiple],
    );

    const handleResizeStart = useCallback(
      () => setDisableDragDrop(true),
      [setDisableDragDrop],
    );
    const handleResizeStop = useCallback(
      ({ widthMultiple: newWidthRaw }) => {
        const newWidth = Math.min(newWidthRaw, widthMultiple - 1);
        if (newWidth !== width) onWidthChange(index, newWidth);
        setDisableDragDrop(false);
      },
      [index, onWidthChange, setDisableDragDrop, widthMultiple, width],
    );

    const handleEdit = useCallback(() => onEdit(index), [onEdit, index]);
    const handleDelete = useCallback(
      () => removeField(index),
      [removeField, index],
    );

    const tooltipContent = useMemo(() => {
      if (editMode)
        return (
          <span style={{ whiteSpace: 'pre-line' }}>
            t( 'Для увеличения/уменьшения ширины поля необходимо потянуть за
            правый край', );
          </span>
        );
      if (!hasDescription) return null;
      return (
        <span style={{ whiteSpace: 'pre-line' }}>
          {t(description || defaultTypeDescription)}
        </span>
      );
    }, [editMode, hasDescription, description, defaultTypeDescription]);

    const renderField = () => {
      if (!isField) {
        return <Empty />;
      }

      if (isMultiple) {
        return (
          <InputTextArea
            name={name}
            isRequired={isRequired}
            tooltipContent={tooltipContent}
            type={type}
            isAutoSize={isAutoSize}
            hasCounter={hasCounter}
            size={size}
            rowCount={rowCount}
          />
        );
      }

      return (
        <InputText
          name={name}
          isRequired={isRequired}
          tooltipContent={tooltipContent}
          type={type}
          hasCounter={hasCounter}
          size={size}
          precision={precision}
          scale={scale}
          enumValues={enumValues}
        />
      );
    };

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
            {renderField()}
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
