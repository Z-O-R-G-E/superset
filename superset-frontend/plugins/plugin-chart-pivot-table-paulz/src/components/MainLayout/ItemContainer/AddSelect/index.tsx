import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import { Select, Tag } from 'antd-v5';
import { JsonObject, useTheme } from '@superset-ui/core';
import { PlusOutlined } from '@ant-design/icons';
import { ContainerType, ItemType } from '../../../../types';
import { getItemName } from '../../../../utils/getItemName';
import { Dropdown } from './Dropdown';

interface AddSelectProps {
  containerType: ContainerType;
  filteredAvailableItems: ItemType[];
  addItem: (container: ContainerType, items: ItemType[]) => void;
  onDropToContainer: () => void;
  namesMapping: JsonObject;
}

export const AddSelect: FC<AddSelectProps> = ({
  containerType,
  filteredAvailableItems,
  addItem,
  onDropToContainer,
  namesMapping,
}) => {
  const theme = useTheme();

  const [wasSelected, setWasSelected] = useState(false);
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
      const selectedItems = values
        .map(value =>
          filteredAvailableItems.find(item => {
            const name = getItemName(item);
            return namesMapping[name] || name === value;
          }),
        )
        .filter(Boolean) as ItemType[];

      if (selectedItems.length) {
        addItem(containerType, selectedItems);
        setWasSelected(true);
      }
    },
    [addItem, containerType, filteredAvailableItems, namesMapping],
  );

  const handleDropdownChange = useCallback(
    (visible: boolean) => {
      setSelectVisible(visible);
      if (!visible) {
        setSearchValue('');
        if (wasSelected) {
          onDropToContainer();
          setWasSelected(false);
        }
      }
    },
    [onDropToContainer, wasSelected],
  );

  const selectOptions = useMemo(
    () =>
      filteredOptions.map(item => {
        const name = getItemName(item);

        return {
          value: namesMapping[name] || name,
          label: namesMapping[name] || name,
        };
      }),
    [filteredOptions, namesMapping],
  );

  const showSelect = useCallback(() => setSelectVisible(true), []);

  useEffect(() => {
    setAddTagVisible(filteredOptions.length === 0);
  }, [filteredOptions.length]);

  return selectVisible ? (
    <Select
      className={`add-select-${containerType}`}
      mode="multiple"
      style={{ margin: 0, width: '2.5rem', height: '1.5rem' }}
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
        height: '1.5rem',
        width: '2.5rem',
        minWidth: '2.5rem',
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
