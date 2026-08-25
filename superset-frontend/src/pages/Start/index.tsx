import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { Collapse } from '@superset-ui/core/components';

import withToasts from 'src/components/MessageToasts/withToasts';
import { User } from 'src/types/bootstrapTypes';

import DashboardTable from 'src/features/start/DashboardTable';
import SubMenu from 'src/features/start/SubMenu';

interface StartProps {
  user: User;
  addDangerToast: (message: string) => void;
}

const StartContainer = styled.div`
  background: ${({ theme }) => theme.colorBgLayout};
`;

function Start({ user, addDangerToast }: StartProps) {
  return (
    <>
      <SubMenu activeChild="Dashboard catalog" name={t('Dashboard catalog')} />

      <StartContainer>
        <Collapse
          ghost
          defaultActiveKey={['dashboards']}
          items={[
            {
              key: 'dashboards',
              label: t('Dashboards'),
              children: (
                <DashboardTable user={user} addDangerToast={addDangerToast} />
              ),
            },
          ]}
        />
      </StartContainer>
    </>
  );
}

export default withToasts(Start);
