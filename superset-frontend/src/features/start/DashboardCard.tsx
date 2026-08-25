import { useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';

import { t } from '@apache-superset/core/translation';
import { SupersetClient } from '@superset-ui/core';

import {
  FaveStar,
  ListViewCard,
  PublishedLabel,
} from '@superset-ui/core/components';

import { CardStyles } from 'src/views/CRUD/utils';
import { assetUrl } from 'src/utils/assetUrl';
import { FacePile } from 'src/components';

import { CatalogDashboard } from './types';

interface DashboardCardProps {
  dashboard: CatalogDashboard;
  loading: boolean;
  saveFavoriteStatus: (id: number, isStarred: boolean) => void;
  favoriteStatus: boolean;
  userId?: string | number;
}

function DashboardCard({
  dashboard,
  userId,
  favoriteStatus,
  saveFavoriteStatus,
  loading,
}: DashboardCardProps) {
  const history = useHistory();

  useEffect(() => {
    if (loading || !dashboard.id) {
      return;
    }

    SupersetClient.get({
      endpoint: `/api/v1/dashboard/${dashboard.id}`,
    });

    return;
  }, [dashboard.id, loading]);

  const handleClick = () => {
    if (dashboard.has_access) {
      history.push(dashboard.url);
    }
  };

  return (
    <CardStyles
      onClick={handleClick}
      style={{
        cursor: dashboard.has_access ? 'pointer' : 'default',
      }}
    >
      <ListViewCard
        loading={loading}
        title={dashboard.dashboard_title}
        certifiedBy={dashboard.certified_by}
        certificationDetails={dashboard.certification_details}
        titleRight={
          <PublishedLabel isPublished={dashboard.published ?? false} />
        }
        url={dashboard.has_access ? dashboard.url : undefined}
        linkComponent={dashboard.has_access ? Link : undefined}
        imgFallbackURL={assetUrl(
          '/static/assets/images/dashboard-card-fallback.svg',
        )}
        cover={<></>}
        description={
          dashboard.changed_on_delta_humanized
            ? t('Modified %s', dashboard.changed_on_delta_humanized)
            : ''
        }
        coverLeft={<FacePile users={dashboard.owners || []} />}
        actions={
          userId && dashboard.has_access ? (
            <ListViewCard.Actions
              onClick={event => {
                event.stopPropagation();
                event.preventDefault();
              }}
            >
              <FaveStar
                itemId={dashboard.id}
                saveFaveStar={saveFavoriteStatus}
                isStarred={favoriteStatus}
              />
            </ListViewCard.Actions>
          ) : undefined
        }
      />
    </CardStyles>
  );
}

export default DashboardCard;
