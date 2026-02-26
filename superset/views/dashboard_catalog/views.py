from flask import Response
from flask_login import login_required
from flask_appbuilder import expose
from sqlalchemy.orm import joinedload
from sqlalchemy import event

from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.tags.models import Tag

from superset.views.base import BaseSupersetView
from superset.utils import json


CACHE_TIMEOUT = 3600
CACHE_KEY = "published_dashboards_catalog_v3"
CACHE_TAGS_KEY = "published_dashboards_tags_v3"


def invalidate_dashboard_catalog_cache():
    cache = cache_manager.cache
    cache.delete(CACHE_KEY)
    cache.delete(CACHE_TAGS_KEY)


@event.listens_for(db.session.__class__, "after_commit")
def receive_after_commit(session):
    for instance in session.new.union(session.dirty).union(session.deleted):
        if isinstance(instance, Dashboard):
            invalidate_dashboard_catalog_cache()
            break


class DashboardCatalogView(BaseSupersetView):
    route_base = "/dashboard_catalog"

    @staticmethod
    def _get_published_dashboards_cached():
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
                "changed_on": dash.changed_on,
                "tags": [
                    {
                        "id": tag.id,
                        "name": tag.name,
                        "type": tag.type,
                    }
                    for tag in dash.tags
                ],
            }
            for dash in dashboards
        ]

        cache.set(CACHE_KEY, result, timeout=CACHE_TIMEOUT)
        return result

    @staticmethod
    def _get_all_published_tags_cached():
        cache = cache_manager.cache
        cached = cache.get(CACHE_TAGS_KEY)
        if cached:
            return cached

        tags_query = (
            db.session.query(Tag.id, Tag.name, Tag.type)
            .join(Dashboard.tags)
            .filter(Dashboard.published.is_(True))
            .distinct()
            .order_by(Tag.name)
            .all()
        )

        result = [
            {
                "id": row.id,
                "name": row.name,
                "type": row.type,
            }
            for row in tags_query
        ]

        cache.set(CACHE_TAGS_KEY, result, timeout=CACHE_TIMEOUT)
        return result

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        dashboards_meta = self._get_published_dashboards_cached()

        dashboard_ids = [d["id"] for d in dashboards_meta]

        dashboards = (
            db.session.query(Dashboard)
            .filter(Dashboard.id.in_(dashboard_ids))
            .all()
        )

        dashboard_map = {d.id: d for d in dashboards}

        dashboards_result = []

        for dash_meta in dashboards_meta:
            dash_obj = dashboard_map.get(dash_meta["id"])
            has_access = (
                security_manager.can_access_dashboard(dash_obj)
                if dash_obj
                else False
            )

            dashboards_result.append(
                {**dash_meta, "has_access": has_access}
            )

        all_tags = self._get_all_published_tags_cached()

        response_payload = {
            "dashboards": dashboards_result,
            "tags": all_tags,
        }

        return Response(
            json.dumps(response_payload),
            mimetype="application/json",
        )
