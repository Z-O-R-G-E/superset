from flask import request, Response, current_app
from flask_login import login_required, current_user
from flask_appbuilder import expose
from superset.extensions import db, cache_manager, security_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json
from sqlalchemy.orm import joinedload

class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"
    DASHBOARD_CACHE_KEY = "dashboard:{id}:role:{role_ids}:v{version}"
    TABLE_CACHE_KEY = "table:{table_id}:role:{role_ids}"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        offset = (page - 1) * page_size
        user_id = current_user.id
        user_role_ids = {role.id for role in current_user.roles}
        cache = getattr(cache_manager, "cache", None)
        dashboard_rbac_enabled = current_app.config.get("FEATURE_FLAGS", {}).get("DASHBOARD_RBAC", False)

        dashboards = (
            db.session.query(Dashboard)
            .options(
                joinedload(Dashboard.owners),
                joinedload(Dashboard.roles),
                joinedload(Dashboard.slices).joinedload("table"),
            )
            .order_by(Dashboard.dashboard_title)
            .offset(offset)
            .limit(page_size)
            .all()
        )

        result = []

        role_key = ",".join(map(str, sorted(user_role_ids)))

        for dash in dashboards:
            version = int(dash.changed_on.timestamp()) if dash.changed_on else 0
            cache_key = self.DASHBOARD_CACHE_KEY.format(id=dash.id, role_ids=role_key, version=version)

            payload = cache.get(cache_key) if cache else None
            if not payload:
                if security_manager.is_admin():
                    has_access = True
                else:
                    has_access = any(owner.id == user_id for owner in dash.owners)

                    if not has_access and dashboard_rbac_enabled:
                        has_access = any(role.id in user_role_ids for role in dash.roles)

                    if not has_access:
                        for slc in dash.slices:
                            table = slc.table
                            if table:
                                table_cache_key = self.TABLE_CACHE_KEY.format(table_id=table.id, role_ids=role_key)
                                table_access = cache.get(table_cache_key) if cache else None
                                if table_access is None:
                                    table_access = security_manager.can_access_datasource(table)
                                    if cache:
                                        cache.set(table_cache_key, table_access, timeout=3600)
                                if table_access:
                                    has_access = True
                                    break

                payload = {
                    "id": dash.id,
                    "dashboard_title": dash.dashboard_title,
                    "has_access": has_access,
                }

                if cache:
                    cache.set(cache_key, payload, timeout=600)

            result.append(payload)

        return Response(json.dumps(result), mimetype="application/json")
