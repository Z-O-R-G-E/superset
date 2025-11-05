import { CSSProperties, FC, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';

import { Flex } from 'antd-v5';
import { Item } from './Item';
import {
  ContainerType,
  DndAcceptType,
  DragItemType,
  ItemType,
} from '../../../types';
import { CONTAINER_TYPES } from '../../../constants';
import { getItemName } from '../../../utils/getItemName';
import { AddSelect } from './AddSelect';

interface ItemContainerProps {
  containerType: ContainerType;
  dndAcceptType: DndAcceptType;
  items: ItemType[];
  filteredAvailableItems: ItemType[];
  moveItem: (
    fromContainer: ContainerType,
    toContainer: ContainerType,
    item: ItemType,
    toIndex?: number,
  ) => void;
  onDropToContainer: () => void;
  style?: CSSProperties;
  addItem: (container: ContainerType, items: ItemType[]) => void;
  removeItem: (container: ContainerType, itemName: ItemType) => void;
}

export const ItemContainer: FC<ItemContainerProps> = ({
  containerType,
  dndAcceptType,
  items,
  filteredAvailableItems,
  moveItem,
  onDropToContainer,
  style,
  addItem,
  removeItem,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, dropRef] = useDrop({
    accept: dndAcceptType,
    hover(dragItem: DragItemType, monitor) {
      if (!ref.current) return;
      if (dragItem.from === containerType) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const children = Array.from(ref.current.children) as HTMLElement[];
      let hoverIndex = children.length;

      for (let i = 0; i < children.length; i += 1) {
        const rect = children[i].getBoundingClientRect();
        if (containerType === CONTAINER_TYPES.ROW) {
          const middleY = (rect.top + rect.bottom) / 2;
          if (clientOffset.y < middleY) {
            hoverIndex = i;
            break;
          }
        } else {
          const middleX = (rect.left + rect.right) / 2;
          if (clientOffset.x < middleX) {
            hoverIndex = i;
            break;
          }
        }
      }

      if (dragItem.index === hoverIndex && dragItem.from === containerType)
        return;

      moveItem(dragItem.from, containerType, dragItem.originItem, hoverIndex);

      // eslint-disable-next-line no-param-reassign
      dragItem.from = containerType;
      // eslint-disable-next-line no-param-reassign
      dragItem.index = hoverIndex;
    },
    drop: () => {
      onDropToContainer();
    },
  });

  const notClosable = useMemo(
    () => !(containerType === CONTAINER_TYPES.METRIC && items.length === 1),
    [containerType, items.length],
  );

  dropRef(ref);

  return (
    <Flex
      gap="0.5rem"
      ref={ref}
      style={{
        ...style,
        alignItems: 'center',
        gridArea: containerType,
      }}
    >
      <AddSelect
        containerType={containerType}
        filteredAvailableItems={filteredAvailableItems}
        addItem={addItem}
        onDropToContainer={onDropToContainer}
      />
      {items.map((item, index) => (
        <Item
          key={getItemName(item)}
          originItem={item}
          index={index}
          notClosable={notClosable}
          containerType={containerType}
          dndAcceptType={dndAcceptType}
          moveItem={moveItem}
          onDropToContainer={onDropToContainer}
          removeItem={removeItem}
        />
      ))}
    </Flex>
  );
};
