import { FC, useCallback, useMemo, useState } from 'react';
import { Select, Tag } from 'antd-v5';
import { useTheme } from '@superset-ui/core';
import { PlusOutlined } from '@ant-design/icons';
import { ContainerType, ItemType } from '../../../../types';
import { getItemName } from '../../../../utils/getItemName';
import { Dropdown } from './Dropdown';

interface AddSelectSelectProps {
  containerType: ContainerType;
  filteredAvailableItems: ItemType[];
  addItem: (container: ContainerType, items: ItemType[]) => void;
  onDropToContainer: () => void;
}

export const AddSelect: FC<AddSelectSelectProps> = ({
  containerType,
  filteredAvailableItems,
  addItem,
  onDropToContainer,
}) => {
  const theme = useTheme();

  const [wasSomethingSelected, setWasSomethingSelected] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectVisible, setSelectVisible] = useState(false);
  const [addTagVisible, setAddTagVisible] = useState(true);

  const filteredOptions = useMemo(() => {
    if (!searchValue) return filteredAvailableItems;
    return filteredAvailableItems.filter(item =>
      getItemName(item).toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [filteredAvailableItems, searchValue]);

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
    [setSelectVisible, wasSomethingSelected, onDropToContainer],
  );

  const selectOptions = useMemo(() => {
    setAddTagVisible(filteredOptions.length === 0);

    return filteredOptions.map(field => ({
      value: getItemName(field),
      label: getItemName(field),
    }));
  }, [filteredOptions]);

  const showSelect = useCallback(() => {
    setSelectVisible(true);
  }, []);

  return selectVisible ? (
    <Select
      className={`add-select-${containerType}`}
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
      dropdownRender={menu => (
        <Dropdown
          menu={menu}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
      )}
      showSearch={false}
    />
  ) : (
    <Tag
      className={`add-tag-${containerType}`}
      style={{
        margin: 0,
        width: '2.5rem',
        textAlign: 'center',
        borderStyle: 'dashed',
        cursor: 'pointer',
        backgroundColor: theme.colors.grayscale.light5,
      }}
      icon={<PlusOutlined />}
      hidden={addTagVisible}
      onClick={showSelect}
    />
  );
};
