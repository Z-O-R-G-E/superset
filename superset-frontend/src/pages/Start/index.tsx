import { useState } from 'react';

import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { Collapse } from '@superset-ui/core/components';
import { Switch } from '@superset-ui/core/components/Switch';

import withToasts from 'src/components/MessageToasts/withToasts';
import { User } from 'src/types/bootstrapTypes';

import DashboardTable from 'src/features/start/DashboardTable';
import SubMenu, { SubMenuProps } from 'src/features/home/SubMenu';

interface StartProps {
  user: User;
  addDangerToast: (message: string) => void;
}

const StartContainer = styled.div`
  background: ${({ theme }) => theme.colorBgLayout};
`;

const StartNav = styled.div`
  ${({ theme }) => `
    .switch {
      display: flex;
      flex-direction: row;
      margin: ${theme.sizeUnit * 4}px;
      span {
        display: block;
        margin: ${theme.sizeUnit}px;
        line-height: ${theme.sizeUnit * 3.5}px;
      }
    }
  `}
`;

function Start({ user, addDangerToast }: StartProps) {
  const isThumbnailsEnabled = isFeatureEnabled(FeatureFlag.Thumbnails);

  const [showThumbnails, setShowThumbnails] = useState(false);

  const handleToggleThumbnails = () => {
    setShowThumbnails(!showThumbnails);
  };

  const menuData: SubMenuProps = {
    activeChild: 'Dashboard catalog',
    name: t('Dashboard catalog'),
  };

  if (isThumbnailsEnabled) {
    menuData.buttons = [
      {
        name: (
          <StartNav>
            <div className="switch">
              <Switch
                checked={showThumbnails}
                onClick={handleToggleThumbnails}
              />
              <span>{t('Thumbnails')}</span>
            </div>
          </StartNav>
        ),
        onClick: handleToggleThumbnails,
        buttonStyle: 'link',
      },
    ];
  }

  return (
    <>
      <SubMenu {...menuData} />

      <StartContainer>
        <Collapse
          ghost
          defaultActiveKey={['dashboards']}
          items={[
            {
              key: 'dashboards',
              label: t('Dashboards'),
              children: (
                <DashboardTable
                  user={user}
                  addDangerToast={addDangerToast}
                  showThumbnails={showThumbnails}
                />
              ),
            },
          ]}
        />
      </StartContainer>
    </>
  );
}

export default withToasts(Start);
