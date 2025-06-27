import { useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useUploadFieldsManagement } from '../../../../hooks/useUploadFieldsManagement';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { ItemTypes } from '../../../../../../constants';

interface DragItem {
  index: number;
  type: string;
}

interface DropResult {
  dropIndex: number;
}

export const useUploadFieldDnD = (index: number, resizing: boolean) => {
  const { moveField } = useUploadFieldsManagement();
  const { editMode, setDisableDragDrop } = useComponentState();

  const dragItem = useMemo<DragItem>(
    () => ({
      index,
      type: ItemTypes.FIELD,
    }),
    [index],
  );

  const handleDragBegin = useCallback(() => {
    setDisableDragDrop(true);
  }, [setDisableDragDrop]);

  const handleDragEnd = useCallback(
    (item: DragItem, monitor: { getDropResult: () => DropResult | null }) => {
      const dropResult = monitor.getDropResult();

      if (item && dropResult) {
        moveField(item.index, dropResult.dropIndex);
      }

      setDisableDragDrop(false);
    },
    [moveField, setDisableDragDrop],
  );

  const handleDrop = useCallback(
    (): DropResult => ({ dropIndex: index }),
    [index],
  );

  const [{ isDragging }, dragRef] = useDrag<
    DragItem,
    DropResult,
    { isDragging: boolean }
  >({
    canDrag: editMode && !resizing,
    item: dragItem,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    begin: handleDragBegin,
    end: handleDragEnd,
  });

  const [{ isOver }, dropRef] = useDrop<
    DragItem,
    DropResult,
    { isOver: boolean }
  >({
    accept: ItemTypes.FIELD,
    canDrop: () => editMode,
    drop: handleDrop,
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
  });

  return {
    dragRef,
    dropRef,
    isDragging,
    isOver,
  };
};
