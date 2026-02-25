from flask import request, Response
from flask_login import login_required
from flask_appbuilder import expose
from superset.extensions import db, security_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json
from sqlalchemy.orm import joinedload


class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        offset = (page - 1) * page_size

        dashboards = (
            db.session.query(Dashboard)
            .options(
                joinedload(Dashboard.owners),
                joinedload(Dashboard.tags),
            )
            .filter(Dashboard.published.is_(True))
            .order_by(Dashboard.dashboard_title)
            .offset(offset)
            .limit(page_size)
            .all()
        )

        result = []
        for dash in dashboards:
            result.append({
                "id": dash.id,
                "dashboard_title": dash.dashboard_title,
                "has_access": security_manager.can_access_dashboard(dash),
                "tags": [tag.name for tag in dash.tags],
            })

        return Response(json.dumps(result), mimetype="application/json")
