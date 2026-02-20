from flask import Response, current_app
from flask_login import login_required, current_user
from flask_appbuilder import expose

from superset.extensions import db, security_manager
from superset.models.dashboard import Dashboard as DashboardModel
from superset.views.base import BaseSupersetView
from superset.utils import json


class DashboardCatalogView(BaseSupersetView):
    """
    Каталог всех опубликованных дашбордов
    """
    route_base = "/dashboard_catalog"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        dashboards = (
            db.session.query(DashboardModel)
            .filter(DashboardModel.published.is_(True))
            .all()
        )

        result = [
            {
                "id": dashboard.id,
                "dashboard_title": dashboard.dashboard_title,
                "has_access": self._has_dashboard_access(dashboard),
            }
            for dashboard in dashboards
        ]

        return Response(
            json.dumps(result),
            mimetype="application/json",
        )

    def _has_dashboard_access(self, dashboard: DashboardModel) -> bool:
        if security_manager.is_admin():
            return True

        if any(owner.id == current_user.id for owner in dashboard.owners or []):
            return True

        dashboard_rbac_enabled = current_app.config.get(
            "FEATURE_FLAGS", {}
        ).get("DASHBOARD_RBAC", False)

        if dashboard_rbac_enabled:
            dashboard_role_ids = {role.id for role in dashboard.roles or []}
            user_role_ids = {role.id for role in current_user.roles}
            return bool(dashboard_role_ids & user_role_ids)

        for slc in dashboard.slices:
            if slc.datasource and security_manager.can_access_datasource(
                slc.datasource
            ):
                return True

        return False
