import { useCallback, useEffect, useMemo, useState } from 'react';

import { t } from '@apache-superset/core/translation';
import { ListViewCard } from '@superset-ui/core/components';

import { useFavoriteStatus } from 'src/views/CRUD/hooks';
import { styled } from '@apache-superset/core/theme';
import { User } from 'src/types/bootstrapTypes';

import DashboardCard from './DashboardCard';
import EmptyState from './EmptyState';
import SubMenu from './SubMenu';
import { getDashboardCatalog } from './api';
import { CatalogDashboard, StartTableTab } from './types';

const PAGE_SIZE = 24;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.sizeUnit * 4}px;
  width: 100%;
`;

interface DashboardTableProps {
  user: User;
  addDangerToast: (message: string) => void;
  showThumbnails: boolean;
}

interface LoadingCardsProps {
  showThumbnails: boolean;
}

function LoadingCards({ showThumbnails }: LoadingCardsProps) {
  return (
    <DashboardGrid>
      {Array.from({ length: 6 }, (_, index) => (
        <ListViewCard
          key={index}
          loading
          cover={showThumbnails ? false : <></>}
          description=""
        />
      ))}
    </DashboardGrid>
  );
}

function DashboardTable({
  user,
  addDangerToast,
  showThumbnails,
}: DashboardTableProps) {
  const [activeTab, setActiveTab] = useState<StartTableTab>(
    StartTableTab.Other,
  );

  const [dashboards, setDashboards] = useState<CatalogDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);

  const dashboardIds = useMemo(
    () =>
      dashboards
        .filter(dashboard => dashboard.has_access)
        .map(dashboard => dashboard.id),
    [dashboards],
  );

  const [saveFavoriteStatus, favoriteStatus] = useFavoriteStatus(
    'dashboard',
    dashboardIds,
    addDangerToast,
  );

  const loadDashboards = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getDashboardCatalog({
        favorite: activeTab === StartTableTab.Favorite,
        page,
        pageSize: PAGE_SIZE,
      });

      setDashboards(response.result);
      setCount(response.count);
    } catch (error) {
      setDashboards([]);

      addDangerToast(t('There was an issue fetching dashboards: %s', error));
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, addDangerToast]);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  const handleTabChange = (tab: StartTableTab) => {
    setActiveTab(tab);
    setPage(0);
  };

  const pageCount = Math.ceil(count / PAGE_SIZE);

  const menuTabs = [
    {
      name: StartTableTab.Favorite,
      label: t('Favorite'),
      onClick: () => handleTabChange(StartTableTab.Favorite),
    },
    {
      name: StartTableTab.Other,
      label: t('All'),
      onClick: () => handleTabChange(StartTableTab.Other),
    },
  ];

  if (loading) {
    return (
      <>
        <SubMenu
          activeChild={activeTab}
          backgroundColor="transparent"
          tabs={menuTabs}
        />

        <LoadingCards showThumbnails={showThumbnails} />
      </>
    );
  }

  return (
    <>
      <SubMenu
        activeChild={activeTab}
        backgroundColor="transparent"
        tabs={menuTabs}
      />

      {dashboards.length > 0 ? (
        <DashboardGrid>
          {dashboards.map(dashboard => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              showThumbnails={showThumbnails}
              userId={user.userId}
              loading={false}
              saveFavoriteStatus={saveFavoriteStatus}
              favoriteStatus={favoriteStatus[dashboard.id] ?? false}
            />
          ))}
        </DashboardGrid>
      ) : (
        <EmptyState favorite={activeTab === StartTableTab.Favorite} />
      )}

      {pageCount > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            margin: '24px 0',
          }}
        >
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(current => current - 1)}
          >
            {t('Previous')}
          </button>

          <span>
            {page + 1} / {pageCount}
          </span>

          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(current => current + 1)}
          >
            {t('Next')}
          </button>
        </div>
      )}
    </>
  );
}

export default DashboardTable;
