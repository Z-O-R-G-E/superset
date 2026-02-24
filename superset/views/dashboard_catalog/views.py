from flask_appbuilder import expose
from sqlalchemy.orm import joinedload, subqueryload
from flask import request, Response, current_app
from flask_login import login_required, current_user
from superset.extensions import db, security_manager
from superset.models.dashboard import Dashboard as DashboardModel
from superset.views.base import BaseSupersetView
from superset.utils import json

class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 0))
        per_page = int(request.args.get("per_page", 50))

        dashboards_query = (
            db.session.query(DashboardModel)
            .options(
                joinedload(DashboardModel.owners),
                joinedload(DashboardModel.roles),
                subqueryload(DashboardModel.slices).joinedload("table")  # правильная связь
            )
            .filter(DashboardModel.published.is_(True))
            .order_by(DashboardModel.dashboard_title)
        )

        total = dashboards_query.count()
        dashboards = dashboards_query.offset(page * per_page).limit(per_page).all()

        current_user_roles = {role.id for role in current_user.roles}
        is_admin = security_manager.is_admin()

        result = []
        for dashboard in dashboards:
            has_access = False

            if is_admin:
                has_access = True
            elif any(owner.id == current_user.id for owner in dashboard.owners or []):
                has_access = True
            else:
                dashboard_rbac_enabled = current_app.config.get(
                    "FEATURE_FLAGS", {}
                ).get("DASHBOARD_RBAC", False)

                if dashboard_rbac_enabled:
                    dashboard_role_ids = {role.id for role in dashboard.roles or []}
                    if dashboard_role_ids & current_user_roles:
                        has_access = True

                if not has_access:
                    for slc in dashboard.slices or []:
                        # Используем реальную связь table, а не property datasource
                        if slc.table and security_manager.can_access_datasource(slc.table):
                            has_access = True
                            break

            result.append(
                {
                    "id": dashboard.id,
                    "dashboard_title": dashboard.dashboard_title,
                    "has_access": has_access,
                }
            )

        return Response(
            json.dumps({
                "total": total,
                "page": page,
                "per_page": per_page,
                "dashboards": result
            }),
            mimetype="application/json",
        )
