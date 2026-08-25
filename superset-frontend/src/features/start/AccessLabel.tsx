import { Icons } from '@superset-ui/core/components/Icons';
import { t } from '@apache-superset/core/translation';
import { useTheme } from '@apache-superset/core/theme';
import { FC } from 'react';
import { Label } from '@superset-ui/core/components';

interface AccessLabelProps {
  hasAccess: boolean; // Whether the item is published
  onClick?: () => void; // Optional click handler
}

export const AccessLabel: FC<AccessLabelProps> = ({ hasAccess, onClick }) => {
  const theme = useTheme();
  const label = hasAccess ? t('Has access') : t('No access');
  const icon = hasAccess ? (
    <Icons.CheckCircleOutlined iconSize="s" iconColor={theme.colorSuccess} />
  ) : (
    <Icons.MinusCircleOutlined iconSize="s" iconColor={theme.colorError} />
  );
  const labelType = hasAccess ? 'success' : 'error';

  return (
    <Label
      type={labelType}
      icon={icon}
      onClick={onClick}
      style={{
        color: hasAccess ? theme.colorSuccessText : theme.colorErrorText,
      }}
    >
      {label}
    </Label>
  );
};
