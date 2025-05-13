import { FC, useCallback, useEffect, useMemo } from 'react';
import cx from 'classnames';
import { Logger, LOG_ACTIONS_RENDER_CHART } from 'src/logger/LogUtils';
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

const FieldsUploader: FC<FieldsUploaderProps> = ({
  id,
  parentId,
  component,
  parentComponent,
  index,
  depth,
  logEvent,
  addDangerToast,
  undoLength,
  redoLength,
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
  const renderStartTime = Logger.getTimestamp();

  useEffect(() => {
    logEvent(LOG_ACTIONS_RENDER_CHART, {
      viz_type: 'fields_uploader',
      start_offset: renderStartTime,
      ts: new Date().getTime(),
      duration: Logger.getTimestamp() - renderStartTime,
    });
  }, [logEvent, renderStartTime]);

  const { type: parentType, meta: parentMeta } = parentComponent;
  const { id: componentId, meta: componentMeta } = component;

  const handleDelete = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const parentWidth = parentMeta?.width ?? GRID_MIN_COLUMN_COUNT;
  const componentWidth = componentMeta?.width ?? GRID_MIN_COLUMN_COUNT;

  const widthMultiple = useMemo(
    () => (parentType === COLUMN_TYPE ? parentWidth : componentWidth),
    [parentType, parentWidth, componentWidth],
  );

  const heightMultiple = componentMeta?.height ?? GRID_MIN_ROW_UNITS;

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
              {editMode && (
                <HoverMenu position="top">
                  <div data-test="dashboard-delete-component-button">
                    <DeleteComponentButton onDelete={handleDelete} />
                  </div>
                </HoverMenu>
              )}
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

export default FieldsUploader;
