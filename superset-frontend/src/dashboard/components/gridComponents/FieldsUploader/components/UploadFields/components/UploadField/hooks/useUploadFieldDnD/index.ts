import { useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useUploadFieldsManagement } from '../../../../hooks/useUploadFieldsManagement';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { ItemTypes } from '../../../../../../constants';

interface DragItem {
  name: string;
  originalIndex: number;
  type: string;
}

export const useUploadFieldDnD = (name: string, resizing: boolean) => {
  const { findField, moveField } = useUploadFieldsManagement();
  const { editMode, setDisableDragDrop } = useComponentState();

  const originalIndex = useMemo(() => findField(name).index, [findField, name]);

  const dragItem = useMemo<DragItem>(
    () => ({
      name,
      originalIndex,
      type: ItemTypes.FIELD,
    }),
    [name, originalIndex],
  );

  const handleDragBegin = useCallback(() => {
    setDisableDragDrop(true);
  }, [setDisableDragDrop]);

  const handleDragEnd = useCallback(
    (item: DragItem | undefined, monitor) => {
      if (!item) return;
      if (!monitor.didDrop()) {
        moveField(item.name, item.originalIndex);
      }
      setDisableDragDrop(false);
    },
    [moveField, setDisableDragDrop],
  );

  const handleHover = useCallback(
    ({ name: draggedName }: DragItem) => {
      if (draggedName !== name) {
        const { index: overIndex } = findField(name);
        const { index: draggedIndex } = findField(draggedName);

        if (draggedIndex !== overIndex) {
          moveField(draggedName, overIndex);
        }
      }
    },
    [findField, moveField, name],
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
