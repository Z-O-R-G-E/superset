from flask import Response
from flask_login import login_required
from flask_appbuilder import expose
from sqlalchemy.orm import joinedload
from sqlalchemy import event

from superset.extensions import db, security_manager, cache_manager
from superset.models.dashboard import Dashboard
from superset.views.base import BaseSupersetView
from superset.utils import json


CACHE_TIMEOUT = 3600
CACHE_KEY = "published_dashboards_catalog_v1"


def invalidate_dashboard_catalog_cache():
    cache_manager.cache.delete(CACHE_KEY)


@event.listens_for(Dashboard, "after_insert")
@event.listens_for(Dashboard, "after_update")
@event.listens_for(Dashboard, "after_delete")
def receive_dashboard_change(mapper, connection, target):
    invalidate_dashboard_catalog_cache()


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

        dashboards_result = []
        tags_map = {}

        for dash in dashboards:
            serialized_tags = []

            for tag in dash.tags:
                tag_data = {
                    "id": tag.id,
                    "name": tag.name,
                    "type": tag.type.value if tag.type else None,
                }

                serialized_tags.append(tag_data)
                tags_map[tag.id] = tag_data

            dashboards_result.append(
                {
                    "id": dash.id,
                    "dashboard_title": dash.dashboard_title,
                    "changed_on": dash.changed_on.isoformat() if dash.changed_on else None,
                    "tags": serialized_tags,
                }
            )

        payload = {
            "dashboards": dashboards_result,
            "tags": sorted(tags_map.values(), key=lambda t: t["name"]),
        }

        json.dumps(payload)

        cache.set(CACHE_KEY, payload, timeout=CACHE_TIMEOUT)
        return payload

    @login_required
    @expose("/list", methods=["GET"])
    def list_dashboards(self):
        catalog = self._get_published_dashboards_cached()

        dashboard_ids = [d["id"] for d in catalog["dashboards"]]

        dashboards = (
            db.session.query(Dashboard)
            .filter(Dashboard.id.in_(dashboard_ids))
            .all()
        )

        dashboard_map = {d.id: d for d in dashboards}

        dashboards_result = []

        for dash_meta in catalog["dashboards"]:
            dash_obj = dashboard_map.get(dash_meta["id"])

            has_access = (
                security_manager.can_access_dashboard(dash_obj)
                if dash_obj
                else False
            )

            dashboards_result.append(
                {**dash_meta, "has_access": has_access}
            )

        response_payload = {
            "dashboards": dashboards_result,
            "tags": catalog["tags"],
        }

        return Response(
            json.dumps(response_payload),
            mimetype="application/json",
        )
