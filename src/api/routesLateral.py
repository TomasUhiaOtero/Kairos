"""
Rutas para la barra lateral:
- Calendars (grupos de eventos)
- TaskGroups (grupos de tareas)
"""
from flask import request, jsonify, Blueprint
from .models import db, Calendar, TaskGroup
from .routes import api, token_required
from .utils import APIException

# ---------- Helpers ----------

lateral = Blueprint('apiLateral', __name__)


def _validate_calendar_ownership(calendar_id: int, user_id: int) -> Calendar:
    cal = Calendar.query.filter_by(id=calendar_id, user_id=user_id).first()
    if not cal:
        raise APIException(
            "El calendario no existe o no pertenece al usuario", 404)
    return cal


def _validate_taskgroup_ownership(group_id: int, user_id: int) -> TaskGroup:
    tg = TaskGroup.query.filter_by(id=group_id, user_id=user_id).first()
    if not tg:
        raise APIException("El grupo no existe o no pertenece al usuario", 404)
    return tg


# ---------- Task Groups ----------
@api.route("/task-groups", methods=["OPTIONS"])
@api.route("/task-groups/<int:group_id>", methods=["OPTIONS"])
def taskgroups_options(group_id=None):
    return ("", 204)


@api.route("/task-groups", methods=["GET"])
@token_required
def list_task_groups(auth_payload):
    user_id = auth_payload.get("user_id")
    groups = TaskGroup.query.filter_by(
        user_id=user_id).order_by(TaskGroup.id.asc()).all()
    return jsonify([g.serialize_with_tasks() for g in groups]), 200


@api.route("/task-groups", methods=["POST"])
@token_required
def create_task_group(auth_payload):
    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    color = (data.get("color") or "").strip()

    if not title:
        raise APIException("El título es requerido", 400)
    if not color:
        raise APIException("El color es requerido", 400)

    tg = TaskGroup(user_id=user_id, title=title, color=color)
    db.session.add(tg)
    db.session.commit()
    return jsonify({"message": "prueba"}), 200
