import {
  FC,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Tag, Tooltip } from 'antd-v5';

import { useDrag, useDrop } from 'react-dnd';
import {
  ContainerType,
  DndAcceptType,
  DragItemType,
  ItemType,
} from '../../../../types';
import { CONTAINER_TYPES } from '../../../../constants';
import { getItemName } from '../../../../utils/getItemName';
import { useDragContext } from '../context/DragContext';

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
) => {
  if (containerType === CONTAINER_TYPES.ROW) {
    const middleY = (rect.bottom - rect.top) / 2;
    const clientY = offset.y - rect.top;
    if (dragIndex < hoverIndex && clientY < middleY) return false;
    if (dragIndex > hoverIndex && clientY > middleY) return false;
  }
  if (containerType === CONTAINER_TYPES.COLUMN) {
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
  const textRef = useRef<HTMLSpanElement>(null);

  const [isOverflow, setIsOverflow] = useState(false);
  const [openTooltip, setOpenTooltip] = useState(false);

  const { isDragging, setDragging } = useDragContext();

  const itemName = useMemo(() => getItemName(originItem), [originItem]);

  useLayoutEffect(() => {
    if (!textRef.current) return;
    const el = textRef.current;
    const overflow = el.scrollWidth > el.clientWidth;
    setIsOverflow(prev => (prev !== overflow ? overflow : prev));
  }, [itemName]);

  useEffect(() => {
    if (isDragging) setOpenTooltip(false);
  }, [isDragging]);

  const [, dragRef] = useDrag<DragItemType, void, undefined>({
    item: {
      type: dndAcceptType,
      originItem,
      index,
      from: containerType,
      originContainer: containerType,
      originIndex: index,
    },
    begin: () => setDragging(true),
    end: (item, monitor) => {
      setDragging(false);
      if (!item) return;

      const didDrop = monitor.didDrop();
      if (
        !didDrop &&
        (item.from !== item.originContainer || item.index !== item.originIndex)
      ) {
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
      // eslint-disable-next-line no-param-reassign
      dragItem.index = hoverIndex;
    },
    drop: onDropToContainer,
  });

  dragRef(dropRef(ref));

  return (
    <Tooltip
      open={openTooltip && !isDragging && isOverflow}
      onOpenChange={setOpenTooltip}
      title={<span style={{ whiteSpace: 'pre-line' }}>{itemName}</span>}
    >
      <Tag
        ref={ref}
        closable={notClosable}
        onClose={() => removeItem(containerType, originItem)}
        onMouseEnter={() => !isDragging && setOpenTooltip(true)}
        onMouseLeave={() => setOpenTooltip(false)}
        style={{
          margin: 0,
          cursor: 'grab',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          ref={textRef}
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {itemName}
        </span>
      </Tag>
    </Tooltip>
  );
};
