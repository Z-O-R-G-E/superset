import PropTypes from 'prop-types';

import { css, styled } from '@superset-ui/core';

import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import WithPopoverMenu from 'src/dashboard/components/menu/WithPopoverMenu';
import { componentShape } from 'src/dashboard/util/propShapes';
import { ROW_TYPE, COLUMN_TYPE } from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';
import { useCallback, useState } from 'react';
import PopoverDropdown from '../../../components/PopoverDropdown';
import headerStyleOptions from '../../util/headerStyleOptions';
import BackgroundStyleDropdown from '../menu/BackgroundStyleDropdown';

const propTypes = {
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,

  // grid related
  availableColumnCount: PropTypes.number.isRequired,
  columnWidth: PropTypes.number.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  onResizeStop: PropTypes.func.isRequired,

  // dnd
  deleteComponent: PropTypes.func.isRequired,
  handleComponentDrop: PropTypes.func.isRequired,
};

const defaultProps = {};

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

const FieldUploader = props => {
  const [isFocused, setIsFocused] = useState(false);

  const {
    component,
    parentComponent,
    index,
    depth,
    availableColumnCount,
    columnWidth,
    onResize,
    onResizeStop,
    handleComponentDrop,
    editMode,
    deleteComponent,
    id,
    parentId,
    onResizeStart,
  } = props;

  const handleChangeFocus = useCallback(nextFocus => {
    setIsFocused(!!nextFocus);
  }, []);

  const handleDeleteComponent = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const handleResizeStart = useCallback(
    e => {
      onResizeStart(e);
    },
    [onResizeStart],
  );

  const widthMultiple =
    parentComponent.type === COLUMN_TYPE
      ? parentComponent.meta.width || GRID_MIN_COLUMN_COUNT
      : component.meta.width || GRID_MIN_COLUMN_COUNT;

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
              onResizeStart={handleResizeStart}
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
                    <DeleteComponentButton onDelete={handleDeleteComponent} />
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

FieldUploader.propTypes = propTypes;
FieldUploader.defaultProps = defaultProps;

export default FieldUploader;
