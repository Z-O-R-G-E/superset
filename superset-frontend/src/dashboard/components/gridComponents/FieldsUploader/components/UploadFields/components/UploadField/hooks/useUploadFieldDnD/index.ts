import { useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useUploadFieldsManagement } from '../../../../hooks/useUploadFieldsManagement';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { ItemTypes } from '../../../../../../constants';

interface DragItem {
  index: number;
  originalIndex: number;
  type: string;
}

export const useUploadFieldDnD = (index: number, resizing: boolean) => {
  const { moveField } = useUploadFieldsManagement();
  const { editMode, setDisableDragDrop } = useComponentState();

  const dragItem = useMemo<DragItem>(
    () => ({
      index,
      originalIndex: index,
      type: ItemTypes.FIELD,
    }),
    [index],
  );

  const handleDragBegin = useCallback(() => {
    setDisableDragDrop(true);
  }, [setDisableDragDrop]);

  const handleDragEnd = useCallback(
    (item: DragItem | undefined, monitor) => {
      if (!item) return;
      if (!monitor.didDrop()) {
        moveField(item.index, item.originalIndex);
      }
      setDisableDragDrop(false);
    },
    [moveField, setDisableDragDrop],
  );

  const handleHover = useCallback(
    (draggedItem: DragItem) => {
      const draggedIndex = draggedItem.index;
      const overIndex = index;

      if (draggedIndex !== overIndex) {
        moveField(draggedIndex, overIndex);
        Object.assign(draggedItem, { index: overIndex });
      }
    },
    [index, moveField],
  );

  const [{ isDragging }, dragRef] = useDrag({
    canDrag: editMode && !resizing,
    item: dragItem,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    begin: handleDragBegin,
    end: handleDragEnd,
  });

  const [, dropRef] = useDrop({
    accept: ItemTypes.FIELD,
    canDrop: () => editMode,
    hover: handleHover,
  });

  return {
    dragRef,
    dropRef,
    isDragging,
  };
};
