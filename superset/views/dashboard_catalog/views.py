from flask import request, Response, current_app
from flask_login import login_required, current_user
from flask_appbuilder import expose
from superset.extensions import db, cache_manager, security_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json

class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"
    DASHBOARD_CACHE_KEY = "dashboard:{id}:user:{user_id}:v{version}"
    DATASOURCE_CACHE_KEY = "user:{user_id}:datasource_access"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        offset = (page - 1) * page_size
        user_id = current_user.id

        feature_flags = current_app.config.get("FEATURE_FLAGS", {})
        dashboard_rbac_enabled = feature_flags.get("DASHBOARD_RBAC", False)
        cache = getattr(cache_manager, "cache", None)

        datasource_access_cache = {}
        if cache:
            datasource_access_cache = cache.get(self.DATASOURCE_CACHE_KEY.format(user_id=user_id)) or {}

        dashboards = (
            db.session.query(Dashboard)
            .order_by(Dashboard.dashboard_title)
            .offset(offset)
            .limit(page_size)
            .all()
        )

        result = []

        for dash in dashboards:
            version = int(dash.changed_on.timestamp()) if dash.changed_on else 0
            cache_key = self.DASHBOARD_CACHE_KEY.format(id=dash.id, user_id=user_id, version=version)

            payload = cache.get(cache_key) if cache else None
            if not payload:
                if security_manager.is_admin():
                    has_access = True
                else:
                    has_access = any(owner.id == user_id for owner in getattr(dash, "owners", []))
                    if not has_access and dashboard_rbac_enabled:
                        user_role_ids = {r.id for r in getattr(current_user, "roles", [])}
                        has_access = any(role.id in user_role_ids for role in getattr(dash, "roles", []))
                    if not has_access:
                        for slc in getattr(dash, "slices", []):
                            ds = getattr(slc, "datasource", None)
                            if ds:
                                if ds.id not in datasource_access_cache:
                                    datasource_access_cache[ds.id] = security_manager.can_access_datasource(ds)
                                if datasource_access_cache[ds.id]:
                                    has_access = True
                                    break

                payload = {
                    "id": dash.id,
                    "dashboard_title": dash.dashboard_title,
                    "has_access": has_access,
                }

                if cache:
                    cache.set(cache_key, json.dumps(payload), timeout=600)

            result.append(payload if isinstance(payload, dict) else json.loads(payload))

        if cache:
            cache.set(self.DATASOURCE_CACHE_KEY.format(user_id=user_id), datasource_access_cache, timeout=600)

        return Response(json.dumps(result), mimetype="application/json")
