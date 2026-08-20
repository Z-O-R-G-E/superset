from flask_appbuilder.api import expose, protect, safe
from flask_appbuilder.models.sqla.filters import FilterEqual
from superset import db, security_manager
from superset.constants import RouteMethod
from superset.dashboards.api import DashboardRestApi
from superset.models.dashboard import Dashboard
from superset.views.base_api import statsd_metrics


class DashboardCatalogRestApi(DashboardRestApi):

    base_filters = [['published', FilterEqual, True]]

    include_route_methods = {RouteMethod.GET_LIST}

    resource_name = "dashboard/catalog"

    @expose("/", methods=("GET",))
    @protect()
    @safe
    @statsd_metrics
    def get_list(self, **kwargs):

        response = super().get_list(**kwargs)

        if response.status_code != 200:
            return response

        data = response.json

        ids = [item["id"] for item in data.get("result", [])]

        if not ids:
            return self.response(200, **data)

        dashboard = {
            d.id: d
            for d in db.session
            .query(Dashboard)
            .filter(Dashboard.id.in_(ids))
            .all()
        }

        for item in data.get("result", []):
            dash = dashboard.get(item["id"])
            item["has_access"] = security_manager.can_access_dashboard(dash) if dash else False

        return self.response(200, **data)
