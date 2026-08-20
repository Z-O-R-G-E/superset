import { Dashboard } from 'src/views/CRUD/types';

export enum StartTableTab {
  Favorite = 'Favorite',
  Other = 'Other',
}

export type CatalogDashboard = Dashboard & {
  has_access: boolean;
};

export interface DashboardCatalogResponse {
  result: CatalogDashboard[];
  count: number;
}
