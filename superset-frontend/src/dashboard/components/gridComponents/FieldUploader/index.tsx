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
import { FC, useCallback, useMemo } from 'react';
import cx from 'classnames';
import { FieldUploaderProps } from './types';
import { FieldUploaderStyles } from './styles';
import { FieldsUploaderForm } from './components';

const FieldUploader: FC<FieldUploaderProps> = ({
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
  const handleDeleteComponent = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const widthMultiple = useMemo(
    () =>
      parentComponent.type === COLUMN_TYPE
        ? parentComponent.meta.width || GRID_MIN_COLUMN_COUNT
        : component.meta.width || GRID_MIN_COLUMN_COUNT,
    [component.meta.width, parentComponent.meta.width, parentComponent.type],
  );

  return (
    <Draggable
      component={component}
      parentComponent={parentComponent}
      orientation={parentComponent.type === ROW_TYPE ? 'column' : 'row'}
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
          id={component.id}
        >
          <ResizableContainer
            id={component.id}
            adjustableWidth={parentComponent.type === ROW_TYPE}
            adjustableHeight
            widthStep={columnWidth}
            widthMultiple={widthMultiple}
            heightStep={GRID_BASE_UNIT}
            heightMultiple={component.meta.height}
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
              {editMode && (
                <HoverMenu position="top">
                  <div data-test="dashboard-delete-component-button">
                    <DeleteComponentButton onDelete={handleDeleteComponent} />
                  </div>
                </HoverMenu>
              )}
              <FieldsUploaderForm
                component={component}
                updateComponents={updateComponents}
                editMode={editMode}
              />
            </div>
          </ResizableContainer>
        </FieldUploaderStyles>
      )}
    </Draggable>
  );
};

export default FieldUploader;
