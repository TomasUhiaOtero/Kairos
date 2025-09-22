# src/api/routesConfig.py
"""
Endpoints de configuración de usuario:
- OPTIONS /api/config  → preflight CORS
- GET     /api/config  → devuelve datos de configuración del usuario autenticado
- PUT     /api/config  → actualiza display_name y/o name y, opcionalmente, la contraseña
"""
from flask import request, jsonify
from werkzeug.security import check_password_hash
from .models import db, User
from .routes import api, token_required
from .utils import APIException


def _user_to_config(u: User) -> dict:
    """Campos necesarios para el formulario de configuración."""
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "display_name": u.display_name,
        "profile_pic": u.profile_pic,
    }


@api.route("/config", methods=["OPTIONS"])
def config_options():
    # Respuesta vacía para preflight CORS
    return ("", 204)


@api.route("/config", methods=["GET"])
@token_required
def get_config(auth_payload):
    """Devuelve la configuración del usuario autenticado."""
    user = User.query.get(auth_payload.get("user_id"))
    if not user:
        raise APIException("Usuario no encontrado", 404)
    return jsonify(_user_to_config(user)), 200


@api.route("/config", methods=["PUT"])
@token_required
def update_config(auth_payload):
    """
    Actualiza la configuración del usuario.
    Body JSON (todos opcionales, pero si cambias password debes enviar current_password):
    {
      "display_name": "NuevoNick",
      "name": "Nombre Completo",
      "current_password": "actual",
      "new_password": "secreta123"
    }
    """
    data = request.get_json() or {}
    user = User.query.get(auth_payload.get("user_id"))
    if not user:
        raise APIException("Usuario no encontrado", 404)

    # Actualización de nombres (si vienen)
    if "display_name" in data:
        dn = (data.get("display_name") or "").strip()
        if not dn:
            raise APIException("El nombre de usuario no puede estar vacío", 400)
        user.display_name = dn

    if "name" in data:
        n = (data.get("name") or "").strip()
        if not n:
            raise APIException("El nombre no puede estar vacío", 400)
        user.name = n

    # Cambio de contraseña (opcional)
    new_pw = (data.get("new_password") or "").strip()
    if new_pw:
        current_pw = (data.get("current_password") or "").strip()
        if not current_pw:
            raise APIException("Debes enviar la contraseña actual para cambiarla", 400)
        if not check_password_hash(user.password, current_pw):
            raise APIException("La contraseña actual no es correcta", 401)
        user.set_password(new_pw)

    db.session.commit()
    return jsonify({"message": "Configuración actualizada", "user": _user_to_config(user)}), 200
