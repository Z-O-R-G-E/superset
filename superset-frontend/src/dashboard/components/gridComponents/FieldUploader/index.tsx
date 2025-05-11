import { FC, useCallback, useMemo } from 'react';
import cx from 'classnames';

import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { ROW_TYPE, COLUMN_TYPE } from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';

import { FieldsUploaderProps } from './types';
import { FieldUploaderStyles } from './styles';
import { FieldsUploaderForm } from './components';
import { UploadInfoProvider } from './contexts/UploadInfoContext';

const FieldUploader: FC<FieldsUploaderProps> = ({
  id,
  parentId,
  component,
  parentComponent,
  index,
  depth,
  availableColumnCount,
  columnWidth,
  onResizeStart,
  onResize,
  onResizeStop,
  editMode,
  deleteComponent,
  updateComponents,
  handleComponentDrop,
}) => {
  const { type: parentType, meta: parentMeta } = parentComponent;
  const { id: componentId, meta: componentMeta } = component;

  const handleDelete = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const widthMultiple = useMemo(() => {
    const parentWidth = parentMeta?.width ?? GRID_MIN_COLUMN_COUNT;
    const componentWidth = componentMeta?.width ?? GRID_MIN_COLUMN_COUNT;
    return parentType === COLUMN_TYPE ? parentWidth : componentWidth;
  }, [parentType, parentMeta?.width, componentMeta?.width]);

  const heightMultiple = componentMeta?.height ?? GRID_MIN_ROW_UNITS;

  const renderDeleteButton = () => (
    <HoverMenu position="top">
      <div data-test="dashboard-delete-component-button">
        <DeleteComponentButton onDelete={handleDelete} />
      </div>
    </HoverMenu>
  );

  return (
    <Draggable
      component={component}
      parentComponent={parentComponent}
      orientation={parentType === ROW_TYPE ? 'column' : 'row'}
      index={index}
      depth={depth}
      onDrop={handleComponentDrop}
      disableDragDrop={false}
      editMode={editMode}
    >
      {({ dragSourceRef }) => (
        <FieldUploaderStyles
          data-test="dashboard-field-uploader-editor"
          className={cx(
            'dashboard-field-uploader',
            editMode && 'dashboard-field-uploader--editing',
          )}
          id={componentId}
        >
          <ResizableContainer
            id={componentId}
            adjustableWidth={parentType === ROW_TYPE}
            adjustableHeight
            widthStep={columnWidth}
            widthMultiple={widthMultiple}
            heightStep={GRID_BASE_UNIT}
            heightMultiple={heightMultiple}
            minWidthMultiple={GRID_MIN_COLUMN_COUNT}
            minHeightMultiple={GRID_MIN_ROW_UNITS}
            maxWidthMultiple={availableColumnCount + widthMultiple}
            onResizeStart={onResizeStart}
            onResize={onResize}
            onResizeStop={onResizeStop}
            editMode={editMode}
          >
            <div
              ref={dragSourceRef}
              className="dashboard-component dashboard-component-chart-holder"
              data-test="dashboard-component-chart-holder"
            >
              {editMode && renderDeleteButton()}
              <UploadInfoProvider
                component={component}
                updateComponents={updateComponents}
                editMode={editMode}
              >
                <FieldsUploaderForm />
              </UploadInfoProvider>
            </div>
          </ResizableContainer>
        </FieldUploaderStyles>
      )}
    </Draggable>
  );
};

export default FieldUploader;
