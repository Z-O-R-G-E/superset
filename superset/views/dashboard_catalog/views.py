from flask_appbuilder import expose
from sqlalchemy.orm import joinedload, subqueryload
from flask import request, Response, current_app
from flask_login import login_required, current_user
from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard as DashboardModel
from superset.models.slice import Slice
from superset.views.base import BaseSupersetView
from superset.utils import json

class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    DASHBOARDS_CACHE_KEY = "dashboard_catalog:all_published"
    DASHBOARD_ACCESS_TIMEOUT = 600
    DASHBOARDS_TIMEOUT = 300

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 0))
        per_page = int(request.args.get("per_page", 50))
        cache = cache_manager.cache

        dashboards_data = cache.get(self.DASHBOARDS_CACHE_KEY)
        if dashboards_data is None:
            dashboards_query = (
                db.session.query(DashboardModel)
                .options(
                    joinedload(DashboardModel.owners),
                    joinedload(DashboardModel.roles),
                    subqueryload(DashboardModel.slices).joinedload("table")
                )
                .filter(DashboardModel.published.is_(True))
                .order_by(DashboardModel.dashboard_title)
            )
            dashboards = dashboards_query.all()

            dashboards_data = [
                {
                    "id": d.id,
                    "dashboard_title": d.dashboard_title,
                    "owners": [o.id for o in d.owners or []],
                    "roles": [r.id for r in d.roles or []],
                    "slices": [slc.id for slc in d.slices if slc.table],
                }
                for d in dashboards
            ]
            cache.set(self.DASHBOARDS_CACHE_KEY, dashboards_data, timeout=self.DASHBOARDS_TIMEOUT)

        total = len(dashboards_data)
        start = page * per_page
        end = start + per_page
        dashboards_page = dashboards_data[start:end]

        is_admin = security_manager.is_admin()
        current_user_roles = {role.id for role in current_user.roles}

        result = []

        for d in dashboards_page:
            cache_key = f"dashboard_access:{current_user.id}:{d['id']}"
            has_access = cache.get(cache_key)

            if has_access is None:
                has_access = False

                if is_admin:
                    has_access = True
                elif current_user.id in d['owners']:
                    has_access = True
                else:
                    dashboard_rbac_enabled = current_app.config.get(
                        "FEATURE_FLAGS", {}
                    ).get("DASHBOARD_RBAC", False)

                    if dashboard_rbac_enabled and current_user_roles & set(d['roles']):
                        has_access = True

                    if not has_access:
                        for slc_id in d['slices']:
                            slc = db.session.get(Slice, slc_id)
                            if slc and slc.table and security_manager.can_access_datasource(slc.table):
                                has_access = True
                                break

                cache.set(cache_key, has_access, timeout=self.DASHBOARD_ACCESS_TIMEOUT)

            result.append({
                "id": d['id'],
                "dashboard_title": d['dashboard_title'],
                "has_access": has_access,
            })

        return Response(
            json.dumps({
                "total": total,
                "page": page,
                "per_page": per_page,
                "dashboards": result
            }),
            mimetype="application/json",
        )
