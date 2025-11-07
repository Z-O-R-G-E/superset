import { FC } from 'react';
import { Divider } from 'antd-v5';

interface GridDividerProps {
  gridArea: string;
  title?: string;
  orientation?: 'center' | 'left' | 'right';
}

export const GridDivider: FC<GridDividerProps> = ({
  gridArea,
  title,
  orientation = 'center',
}) => (
  <Divider
    orientation={orientation}
    style={{ margin: 0, alignSelf: 'center', gridArea }}
  >
    {title && (
      <span style={{ verticalAlign: 'middle', fontSize: '0.7rem' }}>
        {title}
      </span>
    )}
  </Divider>
);
