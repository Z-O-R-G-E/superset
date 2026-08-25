import { useCallback, useEffect, useMemo, useState } from 'react';

import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { ListViewCard } from '@superset-ui/core/components';

import { useFavoriteStatus } from 'src/views/CRUD/hooks';
import { User } from 'src/types/bootstrapTypes';

import DashboardCard from './DashboardCard';
import EmptyState from './EmptyState';
import SubMenu from './SubMenu';
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

interface DashboardTableProps {
  user: User;
  addDangerToast: (message: string) => void;
}

function getSavedTab(): StartTableTab {
  const savedTab = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);

  return savedTab === StartTableTab.Favorite
    ? StartTableTab.Favorite
    : StartTableTab.Other;
}

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.sizeUnit * 4}px;
  margin: ${({ theme }) => theme.sizeUnit * 6}px 0;
`;

const PaginationButton = styled.button`
  padding: ${({ theme }) => theme.sizeUnit}px
    ${({ theme }) => theme.sizeUnit * 2}px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;

const PaginationInfo = styled.span`
  min-width: 50px;
  text-align: center;
`;

function LoadingCards() {
  return (
    <DashboardGrid>
      {Array.from({ length: 6 }, (_, index) => (
        <ListViewCard key={index} loading description="" cover={<></>} />
      ))}
    </DashboardGrid>
  );
}

function DashboardTable({ user, addDangerToast }: DashboardTableProps) {
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

  const pageCount = Math.ceil(count / PAGE_SIZE);

  if (loading) {
    return (
      <>
        <SubMenu
          activeChild={activeTab}
          backgroundColor="transparent"
          tabs={menuTabs}
        />

        <LoadingCards />
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
        <Pagination>
          <PaginationButton
            type="button"
            disabled={page === 0}
            onClick={() => setPage(current => current - 1)}
          >
            {t('Previous')}
          </PaginationButton>

          <PaginationInfo>
            {page + 1} / {pageCount}
          </PaginationInfo>

          <PaginationButton
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(current => current + 1)}
          >
            {t('Next')}
          </PaginationButton>
        </Pagination>
      )}
    </>
  );
}

export default DashboardTable;
