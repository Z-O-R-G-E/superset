import { css, styled } from '@superset-ui/core';

import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import WithPopoverMenu from 'src/dashboard/components/menu/WithPopoverMenu';
import { ROW_TYPE, COLUMN_TYPE } from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';
import { FC, useCallback, useMemo, useState } from 'react';
import { ResizeCallback, ResizeStartCallback } from 're-resizable';
import { LayoutItem } from '../../types';

interface FieldUploaderProps {
  id: string;
  parentId: string;
  component: LayoutItem;
  parentComponent: LayoutItem;
  getComponentById?: (id?: string) => LayoutItem | undefined;
  index: number;
  depth: number;
  editMode: boolean;

  // grid related
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ResizeStartCallback;
  onResize: ResizeCallback;
  onResizeStop: ResizeCallback;

  // dnd
  deleteComponent: (id: string, parentId: string) => void;
  handleComponentDrop: (...args: unknown[]) => unknown;
}

const FieldUploaderStyles = styled.div`
  ${({ theme }) => css`
    &.dashboard-field-uploader {
      overflow: hidden;

      h4,
      h5,
      h6 {
        font-weight: ${theme.typography.weights.normal};
      }

      h5 {
        color: ${theme.colors.grayscale.base};
      }

      h6 {
        font-size: ${theme.typography.sizes.s}px;
      }

      .dashboard-component-chart-holder {
        overflow-y: auto;
        overflow-x: hidden;
      }

      .dashboard--editing & {
        cursor: move;
      }
    }
  `}
`;

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
  getComponentById = () => undefined,
  deleteComponent,
  handleComponentDrop,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeFocus = useCallback(nextFocus => {
    setIsFocused(!!nextFocus);
  }, []);

  const handleDeleteComponent = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const widthMultiple = useMemo(() => {
    const columnParentWidth = getComponentById(
      parentComponent.parents?.find(parent => parent.startsWith(COLUMN_TYPE)),
    )?.meta?.width;

    let widthMultiple = component.meta.width || GRID_MIN_COLUMN_COUNT;
    if (parentComponent.type === COLUMN_TYPE) {
      widthMultiple = parentComponent.meta.width || GRID_MIN_COLUMN_COUNT;
    } else if (columnParentWidth && widthMultiple > columnParentWidth) {
      widthMultiple = columnParentWidth;
    }

    return widthMultiple;
  }, [
    component,
    getComponentById,
    parentComponent.meta.width,
    parentComponent.parents,
    parentComponent.type,
  ]);

  return (
    <Draggable
      component={component}
      parentComponent={parentComponent}
      orientation={parentComponent.type === ROW_TYPE ? 'column' : 'row'}
      index={index}
      depth={depth}
      onDrop={handleComponentDrop}
      disableDragDrop={isFocused}
      editMode={editMode}
    >
      {({ dragSourceRef }) => (
        <WithPopoverMenu
          onChangeFocus={handleChangeFocus}
          menuItems={[<>TODO BUTTON</>]}
          editMode={editMode}
        >
          <FieldUploaderStyles
            data-test="dashboard-field-uploader-editor"
            className="dashboard-field-uploader"
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
              editMode={!isFocused ? editMode : false}
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
                <div>TODO</div>
              </div>
            </ResizableContainer>
          </FieldUploaderStyles>
        </WithPopoverMenu>
      )}
    </Draggable>
  );
};

export default FieldUploader;
