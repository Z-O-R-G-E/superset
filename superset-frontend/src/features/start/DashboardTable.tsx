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
import { DEFAULT_PAGE_SIZE, getDashboardCatalog } from './api';
import { StartTableTab, CatalogDashboard } from './types';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { Switch } from '@superset-ui/core/components/Switch';

const DASHBOARD_TAB_STORAGE_KEY = 'start_dashboard_tab';

const DashboardsNav = styled.div`
  ${({ theme }) => `
    .switch {
      display: flex;
      flex-direction: row;
      margin: ${theme.sizeUnit}px;
      span {
        display: block;
        margin: ${theme.sizeUnit}px;
        line-height: ${theme.sizeUnit * 3.5}px;
      }
    }
  `}
`;

const PaginationContainer = styled.div`
  ${({ theme }) => `
    display: flex;
      flex-direction: column;
      justify-content: center;
      margin-bottom: ${theme.sizeUnit}px;
  `}
`;

const RowCountContainer = styled.div`
  ${({ theme }) => `
      margin-top: ${theme.sizeUnit}px;
      color: ${theme.colorText};
      text-align: center;
  `}
`;

const CardContainer = styled.div`
  ${({ theme }) => `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: ${theme.sizeUnit}px;
    width: 100%;
    padding: ${theme.sizeUnit}px;
  `}
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
}

function getSavedTab(): StartTableTab {
  const savedTab = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);

  return savedTab === StartTableTab.Favorite
    ? StartTableTab.Favorite
    : StartTableTab.Other;
}

function DashboardTable({ user, addDangerToast }: DashboardTableProps) {
  const isThumbnailsEnabled = isFeatureEnabled(FeatureFlag.Thumbnails);

  const [showThumbnails, setShowThumbnails] = useState(false);

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
        pageSize: DEFAULT_PAGE_SIZE,
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

  const handleToggleThumbnails = () => {
    setShowThumbnails(!showThumbnails);
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
        buttons={
          isThumbnailsEnabled
            ? [
                {
                  name: (
                    <DashboardsNav>
                      <div className="switch">
                        <Switch
                          checked={showThumbnails}
                          onClick={handleToggleThumbnails}
                        />
                        <span>{t('Thumbnails')}</span>
                      </div>
                    </DashboardsNav>
                  ),
                  onClick: handleToggleThumbnails,
                  buttonStyle: 'link',
                },
              ]
            : []
        }
      />

      {loading ? (
        <CardContainer>
          {Array.from({ length: 6 }, (_, index) => (
            <ListViewCard
              key={index}
              loading
              cover={showThumbnails ? false : <></>}
              description=""
            />
          ))}
        </CardContainer>
      ) : dashboards.length > 0 ? (
        <CardContainer>
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
        </CardContainer>
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
      {count > 0 && (
        <PaginationContainer>
          <Pagination
            current={page + 1}
            pageSize={DEFAULT_PAGE_SIZE}
            total={count}
            onChange={nextPage => setPage(nextPage - 1)}
            showSizeChanger={false}
            showQuickJumper={false}
            hideOnSinglePage
            align="center"
          />
          <RowCountContainer>
            {`${page * DEFAULT_PAGE_SIZE + 1}-${Math.min(
              (page + 1) * DEFAULT_PAGE_SIZE,
              count,
            )} of ${count}`}
          </RowCountContainer>
        </PaginationContainer>
      )}
    </>
  );
}

export default DashboardTable;
