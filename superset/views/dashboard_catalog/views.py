from flask import Response
from flask_login import login_required
from flask_appbuilder import expose
from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json
from sqlalchemy.orm import joinedload


CACHE_TIMEOUT = 300
CACHE_KEY = "published_dashboards_catalog_v1"


class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    @staticmethod
    def _get_published_dashboards_cached():
        """
        Получаем опубликованные дэшборды с кэшированием в Redis.
        Кэшируем только метаданные (id, title, tags)
        """
        cache = cache_manager.cache
        cached = cache.get(CACHE_KEY)
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

        cache.set(CACHE_KEY, result, timeout=CACHE_TIMEOUT)
        return result

    @staticmethod
    def _get_accessible_dashboard_ids():
        """
        Получаем все ID дэшбордов, к которым текущий пользователь имеет доступ.
        """
        dashboards = db.session.query(Dashboard).all()
        accessible_ids = set(
            dash.id
            for dash in dashboards
            if security_manager.can_access_dashboard(dash)
        )
        return accessible_ids

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        """
        Возвращаем каталог всех опубликованных дэшбордов
        с информацией о доступе текущего пользователя
        """
        dashboards = self._get_published_dashboards_cached()

        accessible_ids = self._get_accessible_dashboard_ids()

        result = [
            {**dash, "has_access": dash["id"] in accessible_ids}
            for dash in dashboards
        ]

        return Response(json.dumps(result), mimetype="application/json")
