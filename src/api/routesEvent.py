from flask import request, jsonify, Blueprint
from datetime import datetime, date, time
from typing import Optional
from .models import db, Calendar, Event, TaskGroup
from .utils import APIException
from .auth import token_required

api = Blueprint('api', __name__)

# -------------------------------
# Helpers
# -------------------------------

def _parse_iso_datetime(value: str) -> datetime:
    value = (value or "").strip()
    if not value:
        raise ValueError("Fecha/hora vacía")
    value = value.replace(" ", "T")
    if "T" not in value:
        value = f"{value}T00:00:00"
    try:
        return datetime.fromisoformat(value)
    except Exception as e:
        raise ValueError(f"Formato datetime inválido: {value}") from e

def _compose_datetimes_from_parts(payload: dict) -> Optional[tuple[datetime, datetime]]:
    d = (payload.get("date") or "").strip()
    st = (payload.get("start_time") or "").strip()
    et = (payload.get("end_time") or "").strip()
    if not d or not st or not et:
        return None
    try:
        d_date = date.fromisoformat(d)
        sh, sm = [int(x) for x in st.split(":")]
        eh, em = [int(x) for x in et.split(":")]
        start_dt = datetime.combine(d_date, time(sh, sm))
        end_dt = datetime.combine(d_date, time(eh, em))
        return start_dt, end_dt
    except Exception as e:
        raise ValueError("Partes de fecha/hora inválidas") from e

def _get_datetimes(payload: dict) -> tuple[datetime, datetime]:
    start_raw = payload.get("start_date") or payload.get("start")
    end_raw = payload.get("end_date") or payload.get("end")
    if start_raw and end_raw:
        return _parse_iso_datetime(start_raw), _parse_iso_datetime(end_raw)
    parts = _compose_datetimes_from_parts(payload)
    if parts:
        return parts
    raise ValueError("Debes enviar start/end en ISO o date + start_time + end_time")

def _validate_calendar_ownership(calendar_id: int, user_id: int) -> Calendar:
    cal = Calendar.query.filter_by(id=calendar_id, user_id=user_id).first()
    if not cal:
        raise APIException("Calendario no encontrado o no pertenece al usuario", 404)
    return cal

def _validate_event_ownership(event_id: int, user_id: int) -> Event:
    ev = Event.query.get(event_id)
    if not ev or ev.calendar.user_id != user_id:
        raise APIException("Evento no encontrado o no pertenece al usuario", 404)
    return ev
TIMEZONE = "Europe/Madrid"

def _serialize_event_google(ev):
    """Serializa un evento al formato compatible con Google Calendar API"""
    return {
        "id": ev.id,
        "calendar_id": ev.calendar_id,
        "summary": ev.title,
        "description": ev.description,
        "start": {
            "dateTime": ev.start_date.isoformat(),
            "timeZone": TIMEZONE
        },
        "end": {
            "dateTime": ev.end_date.isoformat(),
            "timeZone": TIMEZONE
        },
        "colorId": ev.color or None,
        "group_id": ev.group_id
    }

# -------------------------------
# Eventos CRUD (Google Calendar compatible)
# -------------------------------

@api.route("/calendars/<int:calendar_id>/events", methods=["GET"])
@token_required
def list_events(auth_payload, calendar_id: int):
    user_id = auth_payload.get("user_id")
    cal = _validate_calendar_ownership(calendar_id, user_id)
    start_qs = request.args.get("start")
    end_qs = request.args.get("end")
    q = cal.events
    if start_qs:
        start_dt = _parse_iso_datetime(start_qs)
        q = [e for e in q if e.start_date >= start_dt]
    if end_qs:
        end_dt = _parse_iso_datetime(end_qs)
        q = [e for e in q if e.end_date <= end_dt]
    return jsonify([_serialize_event_google(e) for e in sorted(q, key=lambda x: x.start_date)]), 200

@api.route("/calendars/<int:calendar_id>/events", methods=["POST"])
@token_required
def create_event(auth_payload, calendar_id: int):
    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}
    cal = _validate_calendar_ownership(calendar_id, user_id)

    title = (data.get("summary") or "").strip()
    if not title:
        raise APIException("El summary es requerido", 400)
    try:
        start_dt, end_dt = _get_datetimes(data)
    except ValueError as e:
        raise APIException(str(e), 400)
    if end_dt <= start_dt:
        raise APIException("La hora de fin debe ser posterior a la de inicio", 400)

    ev = Event(
        calendar_id=cal.id,
        title=title,
        description=(data.get("description") or "").strip() or None,
        start_date=start_dt,
        end_date=end_dt,
        color=(data.get("colorId") or "").strip() or None,
        group_id=data.get("group_id")  # opcional
    )
    db.session.add(ev)
    db.session.commit()
    return jsonify(_serialize_event_google(ev)), 201

@api.route("/events/<int:event_id>", methods=["GET"])
@token_required
def get_event(auth_payload, event_id: int):
    user_id = auth_payload.get("user_id")
    ev = _validate_event_ownership(event_id, user_id)
    return jsonify(_serialize_event_google(ev)), 200

@api.route("/events/<int:event_id>", methods=["PUT", "PATCH"])
@token_required
def update_event(auth_payload, event_id: int):
    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}
    ev = _validate_event_ownership(event_id, user_id)

    if "summary" in data:
        title = (data.get("summary") or "").strip()
        if not title:
            raise APIException("El summary no puede estar vacío", 400)
        ev.title = title
    if "description" in data:
        ev.description = (data.get("description") or "").strip() or None
    if any(k in data for k in ("start_date", "end_date", "start", "end", "date", "start_time", "end_time")):
        try:
            start_dt, end_dt = _get_datetimes(data)
        except ValueError as e:
            raise APIException(str(e), 400)
        if end_dt <= start_dt:
            raise APIException("La hora de fin debe ser posterior a la de inicio", 400)
        ev.start_date = start_dt
        ev.end_date = end_dt
    if "colorId" in data:
        ev.color = (data.get("colorId") or "").strip() or None
    if "group_id" in data:
        ev.group_id = data.get("group_id")
    db.session.commit()
    return jsonify(_serialize_event_google(ev)), 200

@api.route("/events/<int:event_id>", methods=["DELETE"])
@token_required
def delete_event(auth_payload, event_id: int):
    user_id = auth_payload.get("user_id")
    ev = _validate_event_ownership(event_id, user_id)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({"message": "Evento eliminado"}), 200
