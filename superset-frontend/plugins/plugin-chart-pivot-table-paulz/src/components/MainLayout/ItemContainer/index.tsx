import { CSSProperties, FC, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';

import { Flex } from 'antd-v5';
import { JsonObject } from '@superset-ui/core';
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
  addItem: (container: ContainerType, items: ItemType[]) => void;
  removeItem: (container: ContainerType, item: ItemType) => void;
  namesMapping: JsonObject;
}

export const ItemContainer: FC<ItemContainerProps> = ({
  containerType,
  dndAcceptType,
  items,
  filteredAvailableItems,
  moveItem,
  onDropToContainer,
  addItem,
  removeItem,
  namesMapping,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, dropRef] = useDrop({
    accept: dndAcceptType,
    hover(dragItem: DragItemType, monitor) {
      if (!ref.current || dragItem.from === containerType) return;

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

      moveItem(dragItem.from, containerType, dragItem.originItem, hoverIndex);

      // eslint-disable-next-line no-param-reassign
      dragItem.from = containerType;
      // eslint-disable-next-line no-param-reassign
      dragItem.index = hoverIndex;
    },
    drop: onDropToContainer,
  });

  const notClosable = useMemo(
    () => !(containerType === CONTAINER_TYPES.METRIC && items.length === 1),
    [containerType, items.length],
  );

  dropRef(ref);

  const containerStyle = useMemo<CSSProperties>(() => {
    switch (containerType) {
      case CONTAINER_TYPES.ROW:
        return {
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflowX: 'hidden',
          overflowY: 'auto',
        };
      default:
        return {
          justifyContent: 'flex-start',
          overflowX: 'auto',
          overflowY: 'hidden',
        };
    }
  }, [containerType]);

  return (
    <Flex
      ref={ref}
      className={`item-container-${containerType}`}
      gap="0.5rem"
      style={{
        ...containerStyle,
        alignItems: 'center',
        gridArea: containerType,
      }}
    >
      <AddSelect
        containerType={containerType}
        filteredAvailableItems={filteredAvailableItems}
        addItem={addItem}
        onDropToContainer={onDropToContainer}
        namesMapping={namesMapping}
      />
      {items.map((item, index) => (
        <Item
          key={`tag-${getItemName(item)}`}
          originItem={item}
          index={index}
          notClosable={notClosable}
          containerType={containerType}
          dndAcceptType={dndAcceptType}
          moveItem={moveItem}
          onDropToContainer={onDropToContainer}
          removeItem={removeItem}
          namesMapping={namesMapping}
        />
      ))}
    </Flex>
  );
};
