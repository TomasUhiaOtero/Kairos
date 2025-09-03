"""
API routes with secure password hashing and signed tokens (no extra installs).
"""
from flask import request, jsonify, Blueprint, current_app
from api.models import db, User
from api.utils import APIException
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from functools import wraps

api = Blueprint('api', __name__)
CORS(api, resources={r"*": {"origins": "*"}})

# ------------------- Token helpers -------------------

def _get_serializer():
    secret = current_app.config.get("SECRET_KEY")
    if not secret:
        # Último fallback (no recomendado en prod)
        raise RuntimeError("SECRET_KEY is missing; set FLASK_APP_KEY or app.config['SECRET_KEY']")
    return URLSafeTimedSerializer(secret_key=secret, salt="auth-token")

def create_token(payload: dict) -> str:
    """
    Crea un token firmado con itsdangerous.
    payload: dict con info mínima (p.ej. {'user_id': 1, 'email': 'a@a.com'})
    """
    s = _get_serializer()
    return s.dumps(payload)

def verify_token(token: str, max_age_seconds: int = 60 * 60 * 24) -> dict:
    """
    Verifica y decodifica el token. Lanza excepción si no es válido o expiró.
    max_age_seconds: 1 día por defecto.
    """
    s = _get_serializer()
    try:
        data = s.loads(token, max_age=max_age_seconds)
        return data
    except SignatureExpired:
        raise APIException("Token expirado", 401)
    except BadSignature:
        raise APIException("Token inválido", 401)

def token_required(fn):
    """
    Decorador para proteger rutas.
    Lee Authorization: Bearer <token>
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        parts = auth.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise APIException("Falta header Authorization Bearer", 401)
        token = parts[1]
        payload = verify_token(token)
        # Puedes inyectar el payload al kwargs si te interesa:
        kwargs["auth_payload"] = payload
        return fn(*args, **kwargs)
    return wrapper

# ------------------- Rutas públicas -------------------

@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    return jsonify({
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }), 200

# Preflight explícito (opcional)
@api.route('/signup', methods=['OPTIONS'])
def signup_options():
    return jsonify({}), 200

@api.route('/login', methods=['OPTIONS'])
def login_options():
    return jsonify({}), 200

# ------------------- Auth segura -------------------

@api.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        raise APIException("Email y contraseña son requeridos", 400)

    # ¿ya existe?
    if User.query.filter_by(email=email).first():
        raise APIException("El email ya está registrado", 409)

    # Hash de contraseña con Werkzeug (usa pbkdf2:sha256 por defecto)
    pwd_hash = generate_password_hash(password)

    user = User(email=email, password=pwd_hash, is_active=True)
    db.session.add(user)
    db.session.commit()

    # Opcional: emitir token tras signup
    token = create_token({"user_id": user.id, "email": user.email})

    return jsonify({
        "message": "Usuario creado exitosamente",
        "user": user.serialize(),
        "token": token
    }), 201


@api.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        raise APIException("Email y contraseña son requeridos", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        raise APIException("Credenciales inválidas", 401)

    token = create_token({"user_id": user.id, "email": user.email})

    return jsonify({
        "message": "Login correcto",
        "user": user.serialize(),
        "token": token
    }), 200

# ------------------- Ruta protegida de ejemplo -------------------

@api.route('/profile', methods=['GET'])
@token_required
def profile(auth_payload):
    """
    Ejemplo de endpoint protegido.
    Llama con: Authorization: Bearer <token>
    """
    user_id = auth_payload.get("user_id")
    user = User.query.get(user_id)
    if not user:
        raise APIException("Usuario no encontrado", 404)
    return jsonify({"user": user.serialize()}), 200
