import { Redirect } from 'react-router-dom';

import Welcome from 'src/pages/Home';
import { useDashboard } from 'src/hooks/apiResources';
import { useSelector } from 'react-redux';
import { UserWithPermissionsAndRoles } from '../../types/bootstrapTypes';
import getBootstrapData from 'src/utils/getBootstrapData';
import { Loading } from '@superset-ui/core/components';

const CustomWelcome = () => {
  const bootstrapData = getBootstrapData();
  const dashboardSlug =
    bootstrapData?.common?.conf.START_PAGE_ROUTE_CONFIG.FDREP;

  const user = useSelector(
    (state: { user: UserWithPermissionsAndRoles }) => state.user,
  );
  const hasRequiredRole = 'FDREP' in user.roles;

  const { result: dashboard, error: dashboardError } =
    useDashboard(dashboardSlug);

  if (hasRequiredRole && !dashboard && !dashboardError) {
    return <Loading />;
  }

  if (hasRequiredRole && dashboard) {
    return <Redirect to={`/superset/dashboard/${dashboardSlug}/`} />;
  }

  return <Welcome user={user!} />;
};

export default CustomWelcome;
