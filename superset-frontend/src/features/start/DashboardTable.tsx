import { useCallback, useEffect, useMemo, useState } from 'react';

import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import {
  EmptyState,
  ListViewCard,
  Pagination,
} from '@superset-ui/core/components';

import { useFavoriteStatus } from 'src/views/CRUD/hooks';
import { User } from 'src/types/bootstrapTypes';

import SubMenu from 'src/features/home/SubMenu';

import DashboardCard from './DashboardCard';
import { getDashboardCatalog } from './api';
import { StartTableTab, CatalogDashboard } from './types';

const PAGE_SIZE = 24;
const DASHBOARD_TAB_STORAGE_KEY = 'start_dashboard_tab';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.sizeUnit * 4}px;
  width: 100%;
`;

const EmptyContainer = styled.div`
  min-height: 200px;
  display: flex;
  color: ${({ theme }) => theme.colorTextDescription};
  flex-direction: column;
  justify-content: space-around;
`;

interface DashboardTableProps {
  user: User;
  addDangerToast: (message: string) => void;
  showThumbnails: boolean;
}

function getSavedTab(): StartTableTab {
  const savedTab = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);

  return savedTab === StartTableTab.Favorite
    ? StartTableTab.Favorite
    : StartTableTab.Other;
}

function DashboardTable({
  user,
  addDangerToast,
  showThumbnails,
}: DashboardTableProps) {
  const [activeTab, setActiveTab] = useState<StartTableTab>(getSavedTab);

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

    localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, tab);
  };

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

  return (
    <>
      <SubMenu
        activeChild={activeTab}
        backgroundColor="transparent"
        tabs={menuTabs}
      />

      {loading ? (
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
      ) : dashboards.length > 0 ? (
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
        <EmptyContainer>
          <EmptyState
            image={
              activeTab === StartTableTab.Favorite
                ? 'star-circle.svg'
                : 'empty-dashboard.svg'
            }
            size="large"
            description={t('Nothing here yet')}
          />
        </EmptyContainer>
      )}

      <Pagination
        current={page + 1}
        pageSize={PAGE_SIZE}
        total={count}
        onChange={nextPage => setPage(nextPage - 1)}
        showSizeChanger={false}
        showQuickJumper={false}
        hideOnSinglePage
        align="center"
      />
    </>
  );
}

export default DashboardTable;
