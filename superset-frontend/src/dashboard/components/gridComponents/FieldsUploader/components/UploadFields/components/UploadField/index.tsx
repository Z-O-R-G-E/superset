import { FC, memo, useCallback, useMemo } from 'react';
import { Button, Col, Modal, Space, Tooltip } from 'antd-v5';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { t, useTheme } from '@superset-ui/core';
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
import { useUploadFieldDnD } from './hooks/useUploadFieldDnD';
import { useUploadFieldResize } from './hooks/useUploadFieldResize';
import { createField } from './utils/createField';
import { Empty } from './components';
import { useColumnsSettings } from '../../../../contexts/ColumnsSettingsContext';

type UploadFieldProps = {
  index: number;
  fieldConfig: Omit<UploadFieldConfigType, 'value'>;
  formatOptions: UploadFieldFormatType;
  layoutOptions: UploadFieldLayoutType;
  onEdit: (index: number) => void;
};

const DEFAULT_COLUMN_WIDTH = 3;

export const UploadField: FC<UploadFieldProps> = memo(
  ({ index, fieldConfig, formatOptions, layoutOptions, onEdit }) => {
    const [modal, contextHolder] = Modal.useModal();
    const theme = useTheme();
    const { removeField } = useUploadFieldsManagement();
    const { editMode, widthMultiple } = useComponentState();
    const { indexColumn } = useColumnsSettings();

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
      width = DEFAULT_COLUMN_WIDTH,
    } = layoutOptions;
    const {
      resizing,
      normalizedWidth,
      columnWidth,
      handleResizeStart,
      handleResizeStop,
    } = useUploadFieldResize(index, width);
    const { dragRef, dropRef, isDragging, isOver } = useUploadFieldDnD(
      index,
      resizing,
    );

    const isIndexColumn = useMemo(
      () => name === indexColumn,
      [indexColumn, name],
    );

    const handleEdit = useCallback(() => onEdit(index), [onEdit, index]);
    const handleDelete = useCallback(
      () => removeField(index),
      [removeField, index],
    );

    const showDeleteConfirm = useCallback(() => {
      modal.confirm({
        title: 'Удалить поле?',
        icon: <ExclamationCircleFilled />,
        content:
          'Поле будет удалено и вернуть его можно будет только нажав кнопку отменить действие в меню дэшборда',
        okText: 'Удалить',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk() {
          handleDelete();
        },
      });
    }, [modal, handleDelete]);

    const tooltipContent = useMemo(() => {
      if (!editMode && !hasDescription) return null;
      return (
        <span style={{ whiteSpace: 'pre-line' }}>
          {editMode
            ? t(
                'Для увеличения/уменьшения ширины поля необходимо потянуть за правый край\nДля изменения порядка перетащите поле',
              )
            : t(description || TYPE_DESCRIPTIONS[type])}
        </span>
      );
    }, [editMode, hasDescription, description, type]);

    const FieldComponent = useMemo(() => {
      const Component = createField(type) || createField('TEXT');
      return memo(Component);
    }, [type]);

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
          border: isOver
            ? `0.2rem dashed ${theme.colors.primary.base}`
            : '0.2rem dashed transparent',
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
              {contextHolder}
              <Tooltip title={t('Редактировать поле')}>
                <Button
                  aria-label={t('Редактировать поле')}
                  style={{ padding: 0, height: 'auto', width: 'auto' }}
                  type="link"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                />
              </Tooltip>
              <Tooltip
                title={
                  isIndexColumn
                    ? t('Удалять поле, которое выбрано как индекс, запрещено')
                    : t('Удалить поле')
                }
              >
                <Button
                  aria-label={t('Удалить поле')}
                  style={{ padding: 0, height: 'auto', width: 'auto' }}
                  type="link"
                  icon={<DeleteOutlined />}
                  onClick={showDeleteConfirm}
                  disabled={isIndexColumn}
                />
              </Tooltip>
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
