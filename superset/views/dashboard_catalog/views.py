from flask import Response
from flask_login import login_required
from flask_appbuilder import expose
from superset.extensions import db
from superset.models.dashboard import Dashboard as DashboardModel
from superset.views.base import BaseSupersetView
from superset.utils import json

class DashboardCatalogView(BaseSupersetView):
    """
    Каталог всех опубликованных дашбордов.
    """
    route_base = "/dashboard_catalog"

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        dashboards = db.session.query(DashboardModel).filter(DashboardModel.published.is_(True)).all()

        result = []
        for dashboard in dashboards:
            result.append({
                "id": dashboard.id,
                "title": dashboard.dashboard_title,
            })

        return Response(
            json.dumps(result),
            mimetype="application/json"
        )
