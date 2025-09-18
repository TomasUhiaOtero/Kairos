"""
Rutas de eventos (agenda/calendario) con soporte de rangos horarios.
Se integran al mismo Blueprint `api` definido en routes.py.
"""
from flask import request, jsonify, Blueprint
from datetime import datetime, date, time
from typing import Optional

from .models import db, Event, Calendar
# Reutilizamos el mismo blueprint y decorador de auth del módulo principal
from .routes import api, token_required

# ---------- Helpers ----------

apiEvent = Blueprint('apiEvent', __name__)


def _parse_iso_datetime(value: str) -> datetime:
    """
    Intenta parsear un datetime en ISO 8601. Acepta formatos:
    - "YYYY-MM-DDTHH:MM"
    - "YYYY-MM-DDTHH:MM:SS"
    - "YYYY-MM-DD HH:MM[:SS]"
    - "YYYY-MM-DD" (asume 00:00)
    Lanza ValueError si no puede.
    """
    value = (value or "").strip()
    if not value:
        raise ValueError("Fecha/hora vacía")

    # Normaliza ' ' a 'T' si viene con espacio
    value = value.replace(" ", "T")

    # Si viene solo fecha, asumimos 00:00
    if "T" not in value:
        value = f"{value}T00:00:00"

    try:
        # fromisoformat admite "YYYY-MM-DDTHH:MM[:SS[.ffffff]][+HH:MM]"
        return datetime.fromisoformat(value)
    except Exception as e:
        raise ValueError(f"Formato datetime inválido: {value}") from e


def _compose_datetimes_from_parts(payload: dict) -> Optional[tuple[datetime, datetime]]:
    """
    Alternativa cuando el frontend envía partes separadas:
    {
      "date": "2025-09-08",
      "start_time": "10:00",
      "end_time": "13:00"
    }
    Devuelve (start_dt, end_dt) o None si faltan partes.
    """
    d = (payload.get("date") or "").strip()
    st = (payload.get("start_time") or "").strip()
    et = (payload.get("end_time") or "").strip()
    if not d or not st or not et:
        return None

    try:
        d_date = date.fromisoformat(d)  # YYYY-MM-DD
        sh, sm = [int(x) for x in st.split(":")]
        eh, em = [int(x) for x in et.split(":")]
        start_dt = datetime.combine(d_date, time(sh, sm))
        end_dt = datetime.combine(d_date, time(eh, em))
        return start_dt, end_dt
    except Exception as e:
        raise ValueError(
            "Partes de fecha/hora inválidas (usa ISO: YYYY-MM-DD y HH:MM)") from e


def _get_datetimes(payload: dict) -> tuple[datetime, datetime]:
    """
    Prioriza campos ISO completos y luego partes separadas.
    Acepta cualquiera de estas variantes:
    - { "start_date": "2025-09-08T10:00", "end_date": "2025-09-08T13:00" }
    - { "start": "2025-09-08T10:00", "end": "2025-09-08T13:00" }
    - { "date": "2025-09-08", "start_time": "10:00", "end_time": "13:00" }
    """
    start_raw = payload.get("start_date") or payload.get("start")
    end_raw = payload.get("end_date") or payload.get("end")

    if start_raw and end_raw:
        start_dt = _parse_iso_datetime(start_raw)
        end_dt = _parse_iso_datetime(end_raw)
        return start_dt, end_dt

    parts = _compose_datetimes_from_parts(payload)
    if parts:
        return parts

    raise ValueError(
        "Debes enviar start/end en ISO o bien date + start_time + end_time")


def _validate_ownership(calendar_id: Optional[int], user_id: int):
    """
    Si se pasa calendar_id, valida que el grupo pertenezca al usuario.
    """
    if not calendar_id:
        return
    calendar = Calendar.query.filter_by(
        id=calendar_id, user_id=user_id).first()
    if not calendar:
        from .utils import APIException
        raise APIException("El grupo no existe o no pertenece al usuario", 404)


# ---------- Endpoints ----------

@api.route("/events", methods=["OPTIONS"])
@api.route("/events/<int:event_id>", methods=["OPTIONS"])
def events_options(event_id=None):
    # CORS preflight
    return ("", 204)


@api.route("/events", methods=["GET"])
@token_required
def list_events(auth_payload):
    """
    Lista eventos del usuario autenticado.
    Filtros opcionales por rango:
      /api/events?start=2025-09-08&end=2025-09-09
      /api/events?start=2025-09-08T00:00&end=2025-09-08T23:59
    """
    user_id = auth_payload.get("user_id")

    q = Event.query.filter_by(user_id=user_id)

    start_qs = request.args.get("start")
    end_qs = request.args.get("end")

    try:
        if start_qs:
            start_dt = _parse_iso_datetime(start_qs)
            q = q.filter(Event.start_date >= start_dt)
        if end_qs:
            end_dt = _parse_iso_datetime(end_qs)
            q = q.filter(Event.end_date <= end_dt)
    except ValueError as e:
        from .utils import APIException
        raise APIException(str(e), 400)

    events = q.order_by(Event.start_date.asc()).all()
    return jsonify([e.serialize() for e in events]), 200


@api.route("/events", methods=["POST"])
@token_required
def create_event(auth_payload):
    """
    Crea un evento del usuario.
    Body JSON (varias opciones):
    1) ISO completo:
       {
         "title": "Reunión",
         "start_date": "2025-09-08T10:00",
         "end_date":   "2025-09-08T13:00",
         "description": "Planificación",
         "color": "#a3e4d7",
         "calendar_id": 1
       }
    2) Partes:
       {
         "title": "Clase",
         "date": "2025-09-08",
         "start_time": "10:00",
         "end_time": "13:00"
       }
    """
    from .utils import APIException

    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    if not title:
        raise APIException("El título es requerido", 400)

    try:
        start_dt, end_dt = _get_datetimes(data)
    except ValueError as e:
        raise APIException(str(e), 400)

    if end_dt <= start_dt:
        raise APIException(
            "La hora de fin debe ser posterior a la de inicio", 400)

    calendar_id = data.get("calendar_id")
    _validate_ownership(calendar_id, user_id)

    ev = Event(
        user_id=user_id,
        calendar_id=calendar_id,
        title=title,
        start_date=start_dt,
        end_date=end_dt,
        description=(data.get("description") or "").strip() or None,
        color=(data.get("color") or "").strip() or None,
    )
    db.session.add(ev)
    db.session.commit()
    return jsonify(ev.serialize()), 201


@api.route("/events/<int:event_id>", methods=["GET"])
@token_required
def get_event(auth_payload, event_id: int):
    from .utils import APIException
    user_id = auth_payload.get("user_id")

    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        raise APIException("Evento no encontrado", 404)
    return jsonify(ev.serialize()), 200


@api.route("/events/<int:event_id>", methods=["PUT", "PATCH"])
@token_required
def update_event(auth_payload, event_id: int):
    from .utils import APIException
    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}

    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        raise APIException("Evento no encontrado", 404)

    # Campos opcionales
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            raise APIException("El título no puede estar vacío", 400)
        ev.title = title

    # Soporta actualizar fecha/hora con ISO o partes
    try:
        if any(k in data for k in ("start_date", "end_date", "start", "end")):
            start_raw = data.get("start_date") or data.get("start")
            end_raw = data.get("end_date") or data.get("end")
            if not start_raw or not end_raw:
                raise APIException(
                    "Para actualizar el rango envía start y end", 400)
            ev.start_date = _parse_iso_datetime(start_raw)
            ev.end_date = _parse_iso_datetime(end_raw)
        elif any(k in data for k in ("date", "start_time", "end_time")):
            parts = _compose_datetimes_from_parts(data)
            if not parts:
                raise APIException("Faltan date, start_time o end_time", 400)
            ev.start_date, ev.end_date = parts
    except ValueError as e:
        raise APIException(str(e), 400)

    if ev.end_date <= ev.start_date:
        raise APIException(
            "La hora de fin debe ser posterior a la de inicio", 400)

    if "description" in data:
        ev.description = (data.get("description") or "").strip() or None

    if "color" in data:
        ev.color = (data.get("color") or "").strip() or None

    if "calendar_id" in data:
        gid = data.get("calendar_id")
        _validate_ownership(gid, user_id)
        ev.calendar_id = gid

    db.session.commit()
    return jsonify(ev.serialize()), 200


@api.route("/events/<int:event_id>", methods=["DELETE"])
@token_required
def delete_event(auth_payload, event_id: int):
    from .utils import APIException
    user_id = auth_payload.get("user_id")

    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        raise APIException("Evento no encontrado", 404)

    db.session.delete(ev)
    db.session.commit()
    return jsonify({"message": "Evento eliminado"}), 200

    # ---------- Calendars ----------


@api.route("/calendars", methods=["OPTIONS"])
@api.route("/calendars/<int:calendar_id>", methods=["OPTIONS"])
def calendars_options(calendar_id=None):
    # CORS preflight
    return ("", 204)


@api.route("/calendars", methods=["GET"])
@token_required
def list_calendars(auth_payload):
    """
    Lista todos los calendarios del usuario autenticado.
    """
    user_id = auth_payload.get("user_id")
    calendars = Calendar.query.filter_by(
        user_id=user_id).order_by(Calendar.id.asc()).all()
    return jsonify([c.serialize() for c in calendars]), 200


@api.route("/calendars/<int:calendar_id>", methods=["GET"])
@token_required
def get_calendar(auth_payload, calendar_id: int):
    """
    Devuelve un calendario específico.
    """
    from .utils import APIException
    user_id = auth_payload.get("user_id")

    cal = Calendar.query.filter_by(id=calendar_id, user_id=user_id).first()
    if not cal:
        raise APIException("Calendario no encontrado", 404)

    return jsonify(cal.serialize()), 200


@api.route("/calendars", methods=["POST"])
@token_required
def create_calendar(auth_payload):
    """
    Crea un calendario para el usuario autenticado.
    Body JSON:
    {
      "name": "Trabajo",
      "color": "#3498db",
      "description": "Calendario de reuniones laborales"
    }
    """
    from .utils import APIException

    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    if not name:
        raise APIException("El nombre es requerido", 400)

    description = (data.get("description") or "").strip() or None
    color = (data.get("color") or "").strip() or None

    cal = Calendar(
        user_id=user_id,
        name=name,
        description=description,
        color=color
    )
    db.session.add(cal)
    db.session.commit()

    return jsonify(cal.serialize()), 201


@api.route("/calendars/<int:calendar_id>", methods=["PUT", "PATCH"])
@token_required
def update_calendar(auth_payload, calendar_id: int):
    """
    Actualiza un calendario existente.
    """
    from .utils import APIException
    user_id = auth_payload.get("user_id")
    data = request.get_json() or {}

    cal = Calendar.query.filter_by(id=calendar_id, user_id=user_id).first()
    if not cal:
        raise APIException("Calendario no encontrado", 404)

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            raise APIException("El nombre no puede estar vacío", 400)
        cal.name = name

    if "description" in data:
        cal.description = (data.get("description") or "").strip() or None

    if "color" in data:
        cal.color = (data.get("color") or "").strip() or None

    db.session.commit()
    return jsonify(cal.serialize()), 200


@api.route("/calendars/<int:calendar_id>", methods=["DELETE"])
@token_required
def delete_calendar(auth_payload, calendar_id: int):
    """
    Elimina un calendario (y opcionalmente sus eventos).
    """
    from .utils import APIException
    user_id = auth_payload.get("user_id")

    cal = Calendar.query.filter_by(id=calendar_id, user_id=user_id).first()
    if not cal:
        raise APIException("Calendario no encontrado", 404)

    # Si quieres eliminar también los eventos asociados, descomenta:
    # Event.query.filter_by(calendar_id=calendar_id, user_id=user_id).delete()

    db.session.delete(cal)
    db.session.commit()

    return jsonify({"message": "Calendario eliminado"}), 200
