import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';

import { t } from '@apache-superset/core/translation';
import {
  FeatureFlag,
  isFeatureEnabled,
  SupersetClient,
} from '@superset-ui/core';

import { FaveStar, ListViewCard } from '@superset-ui/core/components';

import { CardStyles } from 'src/views/CRUD/utils';
import { assetUrl } from 'src/utils/assetUrl';
import { FacePile } from 'src/components';

import { CatalogDashboard } from './types';
import { AccessLabel } from './AccessLabel';

interface DashboardCardProps {
  dashboard: CatalogDashboard;
  loading: boolean;
  saveFavoriteStatus: (id: number, isStarred: boolean) => void;
  favoriteStatus: boolean;
  userId?: string | number;
  showThumbnails?: boolean;
}

function DashboardCard({
  dashboard,
  userId,
  favoriteStatus,
  saveFavoriteStatus,
  showThumbnails,
  loading,
}: DashboardCardProps) {
  const history = useHistory();

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    dashboard.thumbnail_url ?? null,
  );

  useEffect(() => {
    if (
      loading ||
      !dashboard.id ||
      !isFeatureEnabled(FeatureFlag.Thumbnails) ||
      !showThumbnails ||
      thumbnailUrl !== null
    ) {
      return;
    }

    if (dashboard.thumbnail_url) {
      setThumbnailUrl(dashboard.thumbnail_url);
      return;
    }

    let cancelled = false;

    SupersetClient.get({
      endpoint: `/api/v1/dashboard/${dashboard.id}`,
    }).then(({ json = {} }) => {
      if (!cancelled) {
        setThumbnailUrl(json.result?.thumbnail_url || '');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    dashboard.id,
    dashboard.thumbnail_url,
    loading,
    showThumbnails,
    thumbnailUrl,
  ]);

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
        titleRight={<AccessLabel hasAccess={dashboard.has_access ?? false} />}
        cover={
          !isFeatureEnabled(FeatureFlag.Thumbnails) || !showThumbnails ? (
            <></>
          ) : null
        }
        url={dashboard.has_access ? dashboard.url : undefined}
        linkComponent={dashboard.has_access ? Link : undefined}
        imgURL={thumbnailUrl}
        imgFallbackURL={assetUrl(
          '/static/assets/images/dashboard-card-fallback.svg',
        )}
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
