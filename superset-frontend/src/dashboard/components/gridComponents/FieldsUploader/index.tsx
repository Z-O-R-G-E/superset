import {
  FC,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  memo,
} from 'react';
import cx from 'classnames';
import { Logger, LOG_ACTIONS_RENDER_CHART } from 'src/logger/LogUtils';
import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import componentTypes from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';
import { FieldsUploaderProps } from './types';
import { FieldUploaderStyles } from './styles';
import { ComponentStateProvider } from './contexts/ComponentStateContext';
import Wrapper from './Layouts/Wrapper';
import { HeaderSettings } from './components/HeaderSettings';
import { DataWarehouse } from './components/DataWarehouse';
import { UploadFields } from './components/UploadFields';

const FieldsUploader: FC<FieldsUploaderProps> = ({
  id,
  parentId,
  component,
  parentComponent,
  index,
  depth,
  logEvent,
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
  const [disableDragDrop, setDisableDragDrop] = useState<boolean>(false);

  const renderStartTime = useRef(Logger.getTimestamp());

  const { type: parentType, meta: parentMeta } = parentComponent;
  const { id: componentId, meta: componentMeta } = component;

  const handleDelete = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const widthMultiple = useMemo(
    () =>
      parentType === componentTypes.COLUMN_TYPE
        ? parentMeta?.width ?? GRID_MIN_COLUMN_COUNT
        : componentMeta?.width ?? GRID_MIN_COLUMN_COUNT,
    [parentType, parentMeta?.width, componentMeta?.width],
  );

  const heightMultiple = useMemo(
    () => componentMeta?.height ?? GRID_MIN_ROW_UNITS,
    [componentMeta?.height],
  );

  useEffect(() => {
    logEvent(LOG_ACTIONS_RENDER_CHART, {
      viz_type: 'fields_uploader',
      start_offset: renderStartTime.current,
      ts: Date.now(),
      duration: Logger.getTimestamp() - renderStartTime.current,
    });
  }, [logEvent]);

  return (
    <Draggable
      component={component}
      parentComponent={parentComponent}
      orientation={parentType === componentTypes.ROW_TYPE ? 'column' : 'row'}
      index={index}
      depth={depth}
      onDrop={handleComponentDrop}
      disableDragDrop={disableDragDrop}
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
            adjustableWidth={parentType === componentTypes.ROW_TYPE}
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
              <ComponentStateProvider
                component={component}
                updateComponents={updateComponents}
                setDisableDragDrop={setDisableDragDrop}
                columnWidth={columnWidth}
                widthMultiple={widthMultiple}
                editMode={editMode}
              >
                <Wrapper>
                  {editMode && <HeaderSettings />}
                  {editMode && <DataWarehouse />}
                  <UploadFields />
                </Wrapper>
              </ComponentStateProvider>
            </div>
          </ResizableContainer>
        </FieldUploaderStyles>
      )}
    </Draggable>
  );
};

export default memo(FieldsUploader);
