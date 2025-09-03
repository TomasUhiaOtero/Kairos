from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, ForeignKey, Integer, DateTime, Text
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'user'

    id: Mapped[int] = mapped_column(primary_key=True)
    displayName: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    signup_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    profile_pic: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(50), default='user')
    last_session: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[bool] = mapped_column(Boolean, default=True)
    google_id: Mapped[int] = mapped_column(Integer, unique=True)
    google_refresh_token: Mapped[str] = mapped_column(String(255))
    google_access_token: Mapped[str] = mapped_column(String(255))

    # Relaciones
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def serialize(self):
        return {
            "id": self.id,
            "displayName": self.displayName,
            "name": self.name,
            "email": self.email,
            "signup_date": self.signup_date.isoformat() if self.signup_date else None,
            "profile_pic": self.profile_pic,
            "rol": self.rol,
            "last_session": self.last_session.isoformat() if self.last_session else None,
            "status": self.status,
        }


class Event(db.Model):
    __tablename__ = 'event'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    description: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(50))

    # Relaciones
    user = relationship("User", back_populates="events")
    groups = relationship("Group", back_populates="event", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "description": self.description,
            "color": self.color
        }


class Task(db.Model):
    __tablename__ = 'task'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    recurrencia: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(50))

    # Relaciones
    user = relationship("User", back_populates="tasks")
    groups = relationship("Group", back_populates="task", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "status": self.status,
            "date": self.date.isoformat() if self.date else None,
            "recurrencia": self.recurrencia,
            "color": self.color
        }


class Group(db.Model):
    __tablename__ = 'group'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=False)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey('event.id'))
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey('task.id'))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    color: Mapped[str] = mapped_column(String(50))

    # Relaciones
    user = relationship("User", back_populates="groups")
    event = relationship("Event", back_populates="groups")
    task = relationship("Task", back_populates="groups")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "task_id": self.task_id,
            "title": self.title,
            "color": self.color
        }
