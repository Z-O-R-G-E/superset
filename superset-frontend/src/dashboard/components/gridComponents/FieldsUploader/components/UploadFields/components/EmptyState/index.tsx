import { FC, memo } from 'react';
import { Typography } from 'antd-v5';
import { t } from '@superset-ui/core';

const emptyStateStyle = {
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
};

export const EmptyState: FC<{ editMode: boolean }> = memo(({ editMode }) => (
  <div style={emptyStateStyle}>
    <Typography.Text
      ellipsis
      style={{ textAlign: 'center', textWrap: 'wrap' }}
      type="secondary"
    >
      {editMode
        ? t('( Ни одно поле не добавлено. )')
        : t(
            'Ни одно поле не добавлено. Для добавления полей перейдите в режим редактирования дэшборда.',
          )}
    </Typography.Text>
  </div>
));
