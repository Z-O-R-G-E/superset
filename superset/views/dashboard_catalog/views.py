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
    META_CACHE_KEY = "dashboard:meta:{id}:v{version}"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        offset = (page - 1) * page_size

        user_id = current_user.id
        user_role_ids = {role.id for role in current_user.roles}
        role_key = ",".join(map(str, sorted(user_role_ids)))

        cache = getattr(cache_manager, "cache", None)
        dashboard_rbac_enabled = current_app.config.get("FEATURE_FLAGS", {}).get(
            "DASHBOARD_RBAC", False)

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
        table_access_map = {}

        for dash in dashboards:
            version = int(dash.changed_on.timestamp()) if dash.changed_on else 0

            meta_cache_key = self.META_CACHE_KEY.format(id=dash.id, version=version)
            meta = cache.get(meta_cache_key) if cache else None
            if not meta:
                meta = {
                    "id": dash.id,
                    "dashboard_title": dash.dashboard_title,
                    "changed_on": dash.changed_on.isoformat() if dash.changed_on else None,
                }
                if cache:
                    cache.set(meta_cache_key, meta, timeout=3600)

            for slc in dash.slices:
                table = slc.table
                if table and table.id not in table_access_map:
                    table_cache_key = self.TABLE_CACHE_KEY.format(table_id=table.id,
                                                                  role_ids=role_key)
                    access = cache.get(table_cache_key) if cache else None
                    if access is None:
                        access = security_manager.can_access_datasource(table)
                        if cache:
                            cache.set(table_cache_key, access, timeout=900)
                    table_access_map[table.id] = access

            dash_cache_key = self.DASHBOARD_CACHE_KEY.format(id=dash.id,
                                                             role_ids=role_key,
                                                             version=version)
            payload = cache.get(dash_cache_key) if cache else None

            if not payload:
                if security_manager.is_admin():
                    has_access = True
                else:
                    has_access = any(owner.id == user_id for owner in dash.owners)
                    if not has_access and dashboard_rbac_enabled:
                        has_access = any(
                            role.id in user_role_ids for role in dash.roles)
                    if not has_access:
                        has_access = any(
                            table_access_map.get(slc.table.id, False) for slc in
                            dash.slices if slc.table
                        )

                payload = {**meta, "has_access": has_access}
                if cache:
                    cache.set(dash_cache_key, payload, timeout=900)

            result.append(payload)

        return Response(json.dumps(result), mimetype="application/json")
