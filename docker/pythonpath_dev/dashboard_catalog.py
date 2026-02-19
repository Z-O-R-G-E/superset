from flask import Blueprint, jsonify, current_app
from flask_appbuilder.api import safe

catalog_bp = Blueprint(
    "dashboard_catalog",
    __name__,
    url_prefix="/api/v1/dashboard_catalog",
)

@catalog_bp.route("/", methods=["GET"])
def dashboard_catalog():

    from superset import db
    from superset.models.dashboard import Dashboard

    dashboards = (
        db.session.query(Dashboard)
        .filter(Dashboard.published.is_(True))
        .options(
            db.joinedload(Dashboard.owners),   # убираем lazy-load
            db.subqueryload(Dashboard.slices)  # prefetch charts
        )
        .all()
    )

    result = []
    for d in dashboards:

        result.append({
            "id": d.id,
            "title": d.dashboard_title,
        })

    return jsonify(result)
