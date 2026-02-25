from flask import Response
from flask_login import login_required
from flask_appbuilder import expose
from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json
from sqlalchemy.orm import joinedload


CACHE_TIMEOUT = 60


class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    @staticmethod
    def _get_published_dashboards_cached():
        cache = cache_manager.cache
        cache_key = "published_dashboards_catalog_v1"

        cached = cache.get(cache_key)
        if cached:
            return cached

        dashboards = (
            db.session.query(Dashboard)
            .options(joinedload(Dashboard.tags))
            .filter(Dashboard.published.is_(True))
            .order_by(Dashboard.dashboard_title)
            .all()
        )

        result = [
            {
                "id": dash.id,
                "dashboard_title": dash.dashboard_title,
                "tags": [tag.name for tag in dash.tags],
            }
            for dash in dashboards
        ]

        cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
        return result

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        dashboards = self._get_published_dashboards_cached()

        result = []

        for dash in dashboards:
            has_access = security_manager.can_access_dashboard(
                db.session.get(Dashboard, dash["id"])
            )

            result.append({
                **dash,
                "has_access": has_access,
            })

        return Response(json.dumps(result), mimetype="application/json")
