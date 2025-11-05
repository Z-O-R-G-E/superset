import { Dispatch, FC, ReactNode, SetStateAction } from 'react';
import { Flex, Input } from 'antd-v5';
import { SearchOutlined } from '@ant-design/icons';

interface DropdownProps {
  menu: ReactNode;
  searchValue: string;
  setSearchValue: Dispatch<SetStateAction<string>>;
}

export const Dropdown: FC<DropdownProps> = ({
  menu,
  searchValue,
  setSearchValue,
}) => (
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
);
