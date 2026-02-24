from flask import Response, current_app
from flask_login import login_required, current_user
from flask_appbuilder import expose

from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json


class DashboardCatalogView(BaseSupersetView):
    """
    Каталог всех опубликованных дэшбордов с индикатором доступа
    """
    route_base = "/dashboard_catalog"
    DASHBOARDS_CACHE_KEY = "dashboard_catalog:{user_id}"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        user_id = current_user.id
        cache_key = self.DASHBOARDS_CACHE_KEY.format(user_id=user_id)

        cached = getattr(cache_manager, "cache", None)
        if cached:
            payload = cached.get(cache_key)
            if payload:
                return Response(payload, mimetype="application/json")

        dashboards = (
            db.session.query(Dashboard)
            .filter(Dashboard.published.is_(True))
            .all()
        )

        feature_flags = current_app.config.get("FEATURE_FLAGS", {})
        dashboard_rbac_enabled = feature_flags.get("DASHBOARD_RBAC", False)

        result = []
        for dashboard in dashboards:
            version_key = int(dashboard.changed_on.timestamp()) if dashboard.changed_on else 0
            result.append({
                "id": dashboard.id,
                "dashboard_title": dashboard.dashboard_title,
                "has_access": self._has_dashboard_access(dashboard, dashboard_rbac_enabled),
                "version": version_key,
            })

        payload = json.dumps(result)

        if cached:
            cached.set(cache_key, payload, timeout=300)

        return Response(payload, mimetype="application/json")

    def _has_dashboard_access(self, dashboard: Dashboard, dashboard_rbac_enabled: bool) -> bool:
        if security_manager.is_admin():
            return True

        if any(owner.id == current_user.id for owner in getattr(dashboard, "owners", []) or []):
            return True

        if dashboard_rbac_enabled:
            dashboard_role_ids = {role.id for role in getattr(dashboard, "roles", []) or []}
            user_role_ids = {role.id for role in getattr(current_user, "roles", []) or []}
            if dashboard_role_ids & user_role_ids:
                return True

        for slc in getattr(dashboard, "slices", []) or []:
            datasource = getattr(slc, "datasource", None)
            if datasource and security_manager.can_access_datasource(datasource):
                return True

        return False
