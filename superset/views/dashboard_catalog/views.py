from flask import request, Response, current_app
from flask_login import login_required, current_user
from flask_appbuilder import expose
from sqlalchemy.orm import selectinload

from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json


class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"
    DASHBOARD_CACHE_KEY = "dashboard:{id}:user:{user_id}:v{version}"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        offset = (page - 1) * page_size

        feature_flags = current_app.config.get("FEATURE_FLAGS", {})
        dashboard_rbac_enabled = feature_flags.get("DASHBOARD_RBAC", False)

        dashboards_query = (
            db.session.query(Dashboard)
            .filter(Dashboard.published.is_(True))
            .options(
                selectinload(Dashboard.owners).load_only("id"),
                selectinload(Dashboard.roles).load_only("id"),
                selectinload(Dashboard.slices),
            )
            .order_by(Dashboard.dashboard_title)
            .offset(offset)
            .limit(page_size)
        )
        dashboards = dashboards_query.all()

        user_id = current_user.id
        cache = getattr(cache_manager, "cache", None)

        result = []
        for dash in dashboards:
            version = int(dash.changed_on.timestamp()) if dash.changed_on else 0
            cache_key = self.DASHBOARD_CACHE_KEY.format(
                id=dash.id, user_id=user_id, version=version
            )

            payload = cache.get(cache_key) if cache else None
            if not payload:
                has_access = self._has_dashboard_access_per_user(
                    dash, dashboard_rbac_enabled, user_id
                )
                payload = {
                    "id": dash.id,
                    "dashboard_title": dash.dashboard_title,
                    "has_access": has_access,
                }
                if cache:
                    cache.set(cache_key, json.dumps(payload), timeout=300)

            result.append(payload if isinstance(payload, dict) else json.loads(payload))

        return Response(json.dumps(result), mimetype="application/json")

    def _has_dashboard_access_per_user(self, dashboard, dashboard_rbac_enabled, user_id):
        """Проверка доступа пользователя к дэшборду"""
        if security_manager.is_admin():
            return True

        if any(owner.id == user_id for owner in getattr(dashboard, "owners", []) or []):
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
