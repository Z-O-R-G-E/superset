import { FeatureFlag, isFeatureEnabled, t } from '@superset-ui/core';
import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useListViewResource } from 'src/views/CRUD/hooks';
import SubMenu from 'src/features/home/SubMenu';
import ListView, { FilterOperator, Filters } from 'src/components/ListView';
import withToasts from 'src/components/MessageToasts/withToasts';
import { QueryObjectColumns } from 'src/views/CRUD/types';
import { ModifiedInfo } from 'src/components/AuditInfo';

const PAGE_SIZE = 25;

interface DashboardCatalogProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

export interface Dashboard {
  changed_on_delta_humanized: string;
  dashboard_title: string;
  id: number;
  url: string;
}

const DASHBOARD_COLUMNS_TO_FETCH = [
  'id',
  'dashboard_title',
  'url',
  'slug',
  'changed_on_delta_humanized',
  'changed_on',
];

function DashboardCatalog(props: DashboardCatalogProps) {
  const { addDangerToast, addSuccessToast } = props;

  const {
    state: {
      loading,
      resourceCount: dashboardCount,
      resourceCollection: dashboards,
    },
    fetchData,
    refreshData,
  } = useListViewResource<Dashboard>(
    'dashboard_all_access',
    t('catalog'),
    addDangerToast,
    false,
    undefined,
    undefined,
    undefined,
    DASHBOARD_COLUMNS_TO_FETCH,
  );

  const initialSort = [{ id: 'changed_on_delta_humanized', desc: true }];

  const columns = useMemo(
    () => [
      {
        Cell: ({
          row: {
            original: { url, dashboard_title: dashboardTitle },
          },
        }: any) => <Link to={url}>{dashboardTitle}</Link>,
        Header: t('Name'),
        accessor: 'dashboard_title',
      },
      {
        Cell: ({
          row: {
            original: {
              changed_on_delta_humanized: changedOn,
              changed_by: changedBy,
            },
          },
        }: any) => <ModifiedInfo date={changedOn} user={changedBy} />,
        Header: t('Last modified'),
        accessor: 'changed_on_delta_humanized',
        size: 'xl',
      },
      {
        accessor: QueryObjectColumns.ChangedBy,
        hidden: true,
      },
    ],
    [],
  );

  const filters: Filters = useMemo(
    () =>
      [
        {
          Header: t('Name'),
          key: 'search',
          id: 'dashboard_title',
          input: 'search',
          operator: FilterOperator.TitleOrSlug,
        },
      ] as Filters,
    [],
  );

  const sortTypes = [
    {
      desc: false,
      id: 'dashboard_title',
      label: t('Alphabetical'),
      value: 'alphabetical',
    },
    {
      desc: true,
      id: 'changed_on_delta_humanized',
      label: t('Recently modified'),
      value: 'recently_modified',
    },
    {
      desc: false,
      id: 'changed_on_delta_humanized',
      label: t('Least recently modified'),
      value: 'least_recently_modified',
    },
  ];

  const renderCard = useCallback((dashboard: Dashboard) => <></>, []);

  return (
    <>
      <SubMenu name={t('Catalog')} />
      <ListView<Dashboard>
        cardSortSelectOptions={sortTypes}
        className="dashboard-catalog-view"
        columns={columns}
        count={dashboardCount}
        data={dashboards}
        fetchData={fetchData}
        refreshData={refreshData}
        filters={filters}
        initialSort={initialSort}
        loading={loading}
        pageSize={PAGE_SIZE}
        addSuccessToast={addSuccessToast}
        addDangerToast={addDangerToast}
        renderCard={renderCard}
        defaultViewMode={
          isFeatureEnabled(FeatureFlag.ListviewsDefaultCardView)
            ? 'card'
            : 'table'
        }
      />
    </>
  );
}

export default withToasts(DashboardCatalog);
