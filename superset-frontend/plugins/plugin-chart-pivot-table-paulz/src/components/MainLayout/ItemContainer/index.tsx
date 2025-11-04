import {
  CSSProperties,
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDrop } from 'react-dnd';

import { Flex, Input, Select, Tag } from 'antd-v5';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useTheme } from '@superset-ui/core';
import { Item } from './Item';
import {
  ContainerType,
  DndAcceptType,
  DragItemType,
  ItemType,
} from '../../../types';
import { CONTAINER_TYPES } from '../../../constants';
import { getItemName } from '../../../utils/getItemName';

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
  const theme = useTheme();

  const ref = useRef<HTMLDivElement>(null);

  const [selectVisible, setSelectVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [wasSomethingSelected, setWasSomethingSelected] = useState(false);

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

  const handleSelectChange = useCallback(
    (values: string[]) => {
      const selectedItems: ItemType[] = values
        .map(value =>
          filteredAvailableItems.find(item => getItemName(item) === value),
        )
        .filter(Boolean) as ItemType[];

      if (selectedItems.length) {
        addItem(containerType, selectedItems);
        setWasSomethingSelected(true);
      }
    },
    [addItem, containerType, filteredAvailableItems],
  );

  const handleDropdownChange = useCallback(
    (visible: boolean) => {
      setSelectVisible(visible);
      if (!visible) {
        setSearchValue('');
        if (wasSomethingSelected) {
          onDropToContainer();
          setWasSomethingSelected(false);
        }
      }
    },
    [wasSomethingSelected, onDropToContainer],
  );

  const showSelect = useCallback(() => {
    setSelectVisible(true);
  }, []);

  const containerStyle: CSSProperties = useMemo(
    () => ({
      ...style,
      alignItems: 'center',
      gridArea: containerType,
    }),
    [style, containerType],
  );

  const filteredOptions = useMemo(() => {
    if (!searchValue) return filteredAvailableItems;
    return filteredAvailableItems.filter(item =>
      getItemName(item).toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [filteredAvailableItems, searchValue]);

  const selectOptions = useMemo(
    () =>
      filteredOptions.map(field => ({
        value: getItemName(field),
        label: getItemName(field),
      })),
    [filteredOptions],
  );

  const notClosable = useMemo(
    () => !(containerType === CONTAINER_TYPES.METRIC && items.length === 1),
    [],
  );

  const dropdownRender = useCallback(
    (menu: ReactNode) => (
      <Flex gap="0.5rem" vertical>
        <Input
          placeholder="Поиск..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          size="small"
          allowClear
        />
        {menu}
      </Flex>
    ),
    [searchValue],
  );

  dropRef(ref);

  return (
    <Flex gap="0.5rem" ref={ref} style={containerStyle}>
      {selectVisible ? (
        <Select
          key={containerType}
          mode="multiple"
          style={{ margin: 0, width: '2.5rem' }}
          dropdownStyle={{
            minWidth: 'auto',
            backgroundColor: theme.colors.grayscale.light5,
          }}
          popupMatchSelectWidth={false}
          options={selectOptions}
          open={selectVisible}
          size="small"
          value={[]}
          onChange={handleSelectChange}
          onDropdownVisibleChange={handleDropdownChange}
          dropdownRender={dropdownRender}
          showSearch={false}
        />
      ) : (
        <Tag
          key={containerType}
          style={{
            margin: 0,
            width: '2.5rem',
            textAlign: 'center',
            borderStyle: 'dashed',
            cursor: 'pointer',
            backgroundColor: theme.colors.grayscale.light5,
          }}
          icon={<PlusOutlined />}
          onClick={showSelect}
        />
      )}
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
