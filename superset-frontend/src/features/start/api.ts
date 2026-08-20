import rison from 'rison';
import { SupersetClient } from '@superset-ui/core';

import { DashboardCatalogResponse } from './types';

const DASHBOARD_CATALOG_ENDPOINT = '/api/v1/dashboard/catalog/';
const DEFAULT_PAGE_SIZE = 24;

export interface GetDashboardCatalogParams {
  favorite?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getDashboardCatalog({
  favorite = false,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
}: GetDashboardCatalogParams = {}): Promise<DashboardCatalogResponse> {
  const query = rison.encode_uri({
    page,
    page_size: pageSize,
    order_column: 'changed_on_delta_humanized',
    order_direction: 'desc',

    ...(favorite
      ? {
          filters: [
            {
              col: 'id',
              opr: 'dashboard_is_favorite',
              value: true,
            },
          ],
        }
      : {}),
  });

  const { json } = await SupersetClient.get({
    endpoint: `${DASHBOARD_CATALOG_ENDPOINT}?q=${query}`,
  });

  return json as DashboardCatalogResponse;
}
