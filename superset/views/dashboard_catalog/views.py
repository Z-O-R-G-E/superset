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

        dashboards = (
            db.session.query(Dashboard)
            .filter(Dashboard.published.is_(True))
            .order_by(Dashboard.dashboard_title)
            .offset(offset)
            .limit(page_size)
            .all()
        )

        result = []

        for dash in dashboards:
            version = int(dash.changed_on.timestamp()) if dash.changed_on else 0
            cache_key = self.DASHBOARD_CACHE_KEY.format(
                id=dash.id, user_id=user_id, version=version
            )

            payload = cache.get(cache_key) if cache else None
            if not payload:
                has_access = (
                    security_manager.is_admin()
                    or any(owner.id == user_id for owner in getattr(dash, "owners", []))
                    or (
                        dashboard_rbac_enabled
                        and any(role.id in {r.id for r in getattr(current_user, "roles", [])}
                                for role in getattr(dash, "roles", []))
                    )
                    or any(
                        getattr(slc, "datasource", None)
                        and security_manager.can_access_datasource(getattr(slc, "datasource"))
                        for slc in getattr(dash, "slices", [])
                    )
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
