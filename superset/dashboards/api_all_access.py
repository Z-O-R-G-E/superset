from flask_appbuilder.api import expose, protect, safe
from flask import g
from superset import db, security_manager, is_feature_enabled
from superset.models.dashboard import Dashboard, is_uuid
from superset.models.slice import Slice
from superset.connectors.sqla.models import SqlaTable
from superset.models.core import Database
from superset.security.guest_token import GuestUser, GuestTokenResourceType
from superset.dashboards.api import DashboardRestApi
from superset.constants import RouteMethod
from superset.views.base_api import statsd_metrics
from superset.utils.core import get_user_id
from superset.utils.filters import get_dataset_access_filters


class DashboardAllAccessRestApi(DashboardRestApi):

    base_filters = []
    include_route_methods = {RouteMethod.GET_LIST}
    resource_name = "dashboard_all_access"

    def _has_access(self, dash: Dashboard) -> bool:
        if security_manager.is_admin():
            return True

        user_id = get_user_id()

        if any(owner.id == user_id for owner in dash.owners):
            return True

        if is_feature_enabled("DASHBOARD_RBAC") and dash.roles:
            user_role_ids = {role.id for role in security_manager.get_user_roles()}
            dash_role_ids = {role.id for role in dash.roles}

            if dash.published and user_role_ids & dash_role_ids:
                return True

        if (
            is_feature_enabled("EMBEDDED_SUPERSET")
            and security_manager.is_guest_user(g.user)
        ):
            guest_user: GuestUser = g.user

            allowed_ids = [
                r["id"]
                for r in guest_user.resources
                if r["type"] == GuestTokenResourceType.DASHBOARD.value
            ]

            if any(is_uuid(i) for i in allowed_ids):
                if dash.embedded and any(
                    emb.uuid in allowed_ids for emb in dash.embedded
                ):
                    return True
            else:
                if dash.id in allowed_ids:
                    return True

        if dash.published:
            slice_ids = [slc.id for slc in dash.slices]

            if not slice_ids:
                return False

            query = (
                db.session.query(Slice.id)
                .join(SqlaTable, Slice.datasource_id == SqlaTable.id)
                .join(Database, SqlaTable.database_id == Database.id)
                .filter(Slice.id.in_(slice_ids))
                .filter(
                    get_dataset_access_filters(
                        Slice,
                        security_manager.can_access_all_datasources(),
                    )
                )
            )

            if db.session.query(query.exists()).scalar():
                return True

        return False

    @expose("/", methods=("GET",))
    @protect()
    @safe
    @statsd_metrics
    def get_list(self, **kwargs):
        response = super().get_list(**kwargs)
        data = response.json

        ids = [item["id"] for item in data.get("result", [])]

        dashboards = {
            d.id: d
            for d in db.session.query(Dashboard).filter(Dashboard.id.in_(ids)).all()
        }

        for item in data.get("result", []):
            dash = dashboards.get(item["id"])
            item["has_access"] = self._has_access(dash) if dash else False

        return self.response(200, **data)
