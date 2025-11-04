import { FC, useRef } from 'react';
import { Tag } from 'antd-v5';

import { useDrag, useDrop } from 'react-dnd';
import {
  ContainerType,
  DndAcceptType,
  DragItemType,
  ItemType,
} from '../../../../types';
import { CONTAINER_TYPES } from '../../../../constants';
import { getItemName } from '../../../../utils/getItemName';

interface ItemProps {
  originItem: ItemType;
  index: number;
  notClosable: boolean;
  containerType: ContainerType;
  dndAcceptType: DndAcceptType;
  moveItem: (
    fromContainer: ContainerType,
    toContainer: ContainerType,
    item: ItemType,
    toIndex?: number,
  ) => void;
  onDropToContainer: () => void;
  removeItem: (container: ContainerType, item: ItemType) => void;
}

const shouldReorder = (
  containerType: ContainerType,
  dragIndex: number,
  hoverIndex: number,
  rect: DOMRect,
  offset: { x: number; y: number },
): boolean => {
  if (containerType === CONTAINER_TYPES.ROW) {
    const middleY = (rect.bottom - rect.top) / 2;
    const clientY = offset.y - rect.top;
    if (dragIndex < hoverIndex && clientY < middleY) return false;
    if (dragIndex > hoverIndex && clientY > middleY) return false;
  } else if (containerType === CONTAINER_TYPES.COLUMN) {
    const middleX = (rect.right - rect.left) / 2;
    const clientX = offset.x - rect.left;
    if (dragIndex < hoverIndex && clientX < middleX) return false;
    if (dragIndex > hoverIndex && clientX > middleX) return false;
  }
  return true;
};

export const Item: FC<ItemProps> = ({
  originItem,
  index,
  notClosable,
  containerType,
  dndAcceptType,
  moveItem,
  onDropToContainer,
  removeItem,
}) => {
  const ref = useRef<HTMLElement>(null);

  const [, dragRef] = useDrag<DragItemType, void, unknown>({
    item: {
      type: dndAcceptType,
      originItem,
      index,
      from: containerType,
      originContainer: containerType,
      originIndex: index,
    },
    end: (item, monitor) => {
      if (!item) return;

      const didDrop = monitor.didDrop();
      if (!didDrop) {
        if (
          item.from === item.originContainer &&
          item.index === item.originIndex
        ) {
          return;
        }
        moveItem(
          item.from,
          item.originContainer,
          item.originItem,
          item.originIndex,
        );
      }
    },
  });

  const [, dropRef] = useDrop<DragItemType, void, unknown>({
    accept: dndAcceptType,
    hover(dragItem, monitor) {
      if (!ref.current) return;

      const dragIndex = dragItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const rect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      if (
        !shouldReorder(containerType, dragIndex, hoverIndex, rect, clientOffset)
      )
        return;

      moveItem(dragItem.from, containerType, dragItem.originItem, hoverIndex);
      dragItem.index = hoverIndex;
    },
    drop() {
      onDropToContainer();
    },
  });

  dragRef(dropRef(ref));

  return (
    <Tag
      ref={ref}
      style={{ margin: 0, cursor: 'grab' }}
      closable={notClosable}
      onClose={() => removeItem(containerType, originItem)}
    >
      {getItemName(originItem)}
    </Tag>
  );
};
