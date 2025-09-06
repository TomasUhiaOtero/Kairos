import os
from flask import Flask, request, jsonify, url_for
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_cors import CORS
from utils import APIException, generate_sitemap
from admin import setup_admin
from models import db, User, Personaje, Planeta, Favorito, Task
# from models import Person

app = Flask(__name__)
app.url_map.strict_slashes = False

db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

MIGRATE = Migrate(app, db)
db.init_app(app)
CORS(app)
setup_admin(app)

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    return generate_sitemap(app)


# AQUI EMPIEZAN MIS RUTAS! --->

# Endpoints

@app.route("/api/users/<int:user_id>/tasks", methods=["GET"])
def get_user_tasks(user_id):
    tasks = Task.query.filter_by(user_id=user_id).all()
    return jsonify([task.serialize() for task in tasks]), 200


#  Obtener todas las tareas de un usuario

@app.route("/api/users/<int:user_id>/tasks", methods=["GET"])
def get_user_tasks(user_id):
    tasks = Task.query.filter_by(user_id=user_id).all()
    return jsonify([task.serialize() for task in tasks]), 200


# Crear nueva tarea para un usuario

@app.route("/api/users/<int:user_id>/tasks", methods=["POST"])
def create_task(user_id):
    data = request.get_json()

    if "title" not in data:
        return jsonify({"error": "Falta el campo 'title'"}), 400

    new_task = Task(
        user_id=user_id,
        title=data["title"],
        status=data.get("status", "pending"),
        date=data.get("date"),
        recurrencia=data.get("recurrencia"),
        color=data.get("color")
    )

    db.session.add(new_task)
    db.session.commit()

    return jsonify(new_task.serialize()), 201

# Eliminar una tarea de un usuario

@app.route("/api/users/<int:user_id>/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(user_id, task_id):
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return jsonify({"error": "Tarea no encontrada"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"msg": "Tarea eliminada correctamente"}), 200

# Actualizar una tarea de un usuario

@app.route("/api/users/<int:user_id>/tasks/<int:task_id>", methods=["PUT"])
def update_task(user_id, task_id):
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return jsonify({"error": "Tarea no encontrada"}), 404

    data = request.get_json()

    task.title = data.get("title", task.title)
    task.status = data.get("status", task.status)
    task.date = data.get("date", task.date)
    task.recurrencia = data.get("recurrencia", task.recurrencia)
    task.color = data.get("color", task.color)

    db.session.commit()
    return jsonify(task.serialize()), 200



# this only runs if `$ python src/app.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=PORT, debug=False)
