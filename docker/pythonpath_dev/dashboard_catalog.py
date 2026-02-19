from flask import Blueprint, jsonify, current_app
from flask_login import current_user

catalog_bp = Blueprint(
    "dashboard_catalog",
    __name__,
    url_prefix="/api/v1/dashboard_catalog",
)

@catalog_bp.route("/", methods=["GET"])
@login_required
def dashboard_catalog():

    from superset import db
    from superset.models.dashboard import Dashboard

    sm = current_app.appbuilder.sm

    # 1️⃣ Получаем ВСЕ опубликованные дашборды
    dashboards = (
        db.session.query(Dashboard)
        .filter(Dashboard.published.is_(True))
        .options(
            db.joinedload(Dashboard.owners),   # убираем lazy-load
            db.subqueryload(Dashboard.slices)  # prefetch charts
        )
        .all()
    )

    # 2️⃣ Админ — shortcut
    if sm.is_admin():
        return jsonify([
            {
                "id": d.id,
                "title": d.dashboard_title,
                "has_access": True,
            }
            for d in dashboards
        ])

    # 3️⃣ Проверяем доступ корректно через Superset security
    result = []
    for d in dashboards:
        has_access = sm.has_access("can_read", d)

        result.append({
            "id": d.id,
            "title": d.dashboard_title,
            "has_access": has_access,
        })

    return jsonify(result)
