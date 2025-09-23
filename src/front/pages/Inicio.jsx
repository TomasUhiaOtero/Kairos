// Inicio.jsx
import React, { useEffect } from "react";
import Calendar from "../components/Calendar";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { apiListUserTaskGroups, apiListCalendars, apiListEvents, getUserId } from "../lib/api.js";

/* =========================
   Helpers (definidos antes de usarlos)
   ========================= */


// partir ISO en fecha/hora
const parseISOToParts = (iso) => {
  if (!iso) return { date: null, time: null };
  const [d, t] = String(iso).split("T");
  return { date: d || null, time: t ? t.slice(0, 5) : null };
};

// normalizar evento del backend -> shape del store
const normalizeEventFromServer = (s) => {
  const { date: sDate, time: sTime } = parseISOToParts(s.start_date);
  const { date: eDate, time: eTime } = parseISOToParts(s.end_date);
  return {
    id: String(s.id),
    type: "event",
    title: s.title,
    calendarId: s.calendar_id,
    startDate: sDate || null,
    endDate: eDate || sDate || null,
    startTime: s.all_day ? "" : (sTime || ""),
    endTime: s.all_day ? "" : (eTime || ""),
    allDay: !!s.all_day,
    description: s.description || "",
    color: s.color || "",
  };
};

// --- Helpers de fecha en LOCAL ---
function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
function parseLocalYMD(s) {
  if (!s) return null;
  if (isYMD(s)) {
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(y, m - 1, d); // 00:00 local
  }
  // si viene ISO con hora, cae al parser nativo
  return new Date(s);
}
function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`; // clave local
}

/* =========================
   Componente
   ========================= */

export const Inicio = () => {
  const { store, dispatch } = useGlobalReducer();

  // ⬇️ Handlers para upsert/eliminar en el store (UI inmediata)
  const handleAddItem = (item) => {
    if (!item) return;
    if (item.type === "task") {
      // Si CreateEvent manda {mode:"edit", originalId}, el reducer/Calendar deberían respetarlo;
      // aquí usamos el flujo simple con tu reducer actual:
      // - EDIT: usa UPDATE_TASK (requiere id definitivo en payload)
      // - CREATE: usa ADD_TASK
      if (item.mode === "edit" && item.originalId) {
        // Normalizamos al id real que quieras conservar
        dispatch({ type: "UPDATE_TASK", payload: { ...item, id: String(item.originalId) } });
      } else if (item.id) {
        dispatch({ type: "ADD_TASK", payload: { ...item, id: String(item.id) } });
      }
    } else if (item.type === "event") {
      if (item.mode === "edit" && item.originalId) {
        dispatch({ type: "UPDATE_EVENT", payload: { ...item, id: String(item.originalId) } });
      } else if (item.id) {
        dispatch({ type: "ADD_EVENT", payload: { ...item, id: String(item.id) } });
      }
    }
  };

  const handleDeleteItem = (id, type) => {
    const strId = String(id);
    if (type === "task") {
      dispatch({ type: "DELETE_TASK", payload: strId });
    } else if (type === "event") {
      dispatch({ type: "DELETE_EVENT", payload: strId });
    }
  };

  useEffect(() => {
    const getData = async () => {
      // Calendarios
      const listCalendar = await apiListCalendars();

      // Eventos
      const eventsRaw = await apiListEvents();
      const events = Array.isArray(eventsRaw) ? eventsRaw.map(normalizeEventFromServer) : [];

      dispatch({
        type: "SET_CALENDARS",
        payload: { calendars: listCalendar, events },
      });

      // Obtener userId
      const userId = getUserId({ storeUser: store.user });
      if (!userId) {
        console.warn("No hay userId: no se cargarán grupos/tareas del usuario.");
        dispatch({ type: "SET_TASKGROUPS", payload: { taskgroup: [], tasks: [] } });
        return;
      }

      // Grupos
      const listTaskGroup = await apiListUserTaskGroups(userId);
      dispatch({ type: "SET_TASKGROUPS", payload: { taskgroup: listTaskGroup, tasks: [] } });

      // Tareas
      const base = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : undefined,
        Accept: "application/json",
      };
      const resp = await fetch(`${base}/api/users/${userId}/tasks`, { headers });
      const tasks = resp.ok ? await resp.json() : [];

      // Normaliza tareas al shape de la UI
      const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map((t) => ({
        id: t.id,
        type: "task",
        title: t.title,
        groupId: t.task_group_id,
        done: !!t.status,
        startDate: t.date ? String(t.date).slice(0, 10) : null,
      }));

      // 🔐 Anti-duplicados (visual) por (id) y por (title|date|groupId)
      const byId = new Map();
      normalizedTasks.forEach((t) => byId.set(String(t.id), t));

      const byContent = new Map();
      Array.from(byId.values()).forEach((t) => {
        const key = `${(t.title || "").trim().toLowerCase()}|${t.startDate || ""}|${t.groupId || ""}`;
        byContent.set(key, t);
      });

      const dedupedTasks = Array.from(byContent.values());
      dispatch({ type: "SET_TASKS", payload: dedupedTasks });
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rango hoy/semana
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(today.getDate() + 7);

  const normalizeDate = (d) => {
    if (!d) return null;
    const date = parseLocalYMD(d);
    return startOfLocalDay(date);
  };

  const tasks = store.tasks.map((t) => ({
    ...t,
    type: "task",
    _date: normalizeDate(t.startDate || t.start),
  }));
  const events = store.events.map((e) => ({
    ...e,
    type: "event",
    _date: normalizeDate(e.startDate || e.start),
  }));

  const noDateTasks = tasks.filter((t) => !t._date);
  const todayItems = [...tasks, ...events].filter((i) => i._date?.getTime() === today.getTime());
  const weekItems = [...tasks, ...events].filter((i) => i._date && i._date > today && i._date <= weekLater);

  const getItemColor = (item) => {
    if (item.type === "task") {
      const group = store.taskGroup.find((g) => g.id === item.groupId);
      return group?.color || "#2563eb";
    }
    if (item.type === "event") {
      const cal = store.calendar.find((c) => c.id === item.calendarId);
      return cal?.color || "#2563eb";
    }
    return "#888";
  };

  const toggleTaskDone = (task) => {
    dispatch({ type: "UPDATE_TASK", payload: { ...task, done: !task.done } });
  };

  const renderFullCalendarStyle = (item) => {
    const color = getItemColor(item);
    const displayTime = item.startTime ? item.startTime : "";


    
    return (

      <div
        key={`${item.type}-${item.id}`}
        className={`item ${item.type}`}
        style={
          item.type === "event"
            ? { backgroundColor: `${color}30`, color: color }
            : { borderRadius: "16px", color: color }
        }
      >
        {item.type === "task" && (
          <div
            className={`check ${item.done ? "done" : ""}`}
            onClick={() => toggleTaskDone(item)}
            style={{ borderColor: color, backgroundColor: item.done ? color : "transparent" }}
          />
        )}

        {displayTime && <span style={{ marginLeft: 4, fontWeight: "semi-bold" }}>{displayTime}</span>}
        <span style={{ marginLeft: 4, textDecoration: item.done ? "line-through" : "none" }}>{item.title}</span>
      </div>
    );
  };

  return (
    <div className="container-fluid mx-auto justify-center  px-2">
      <div className="flex flex-col lg:flex-row lg:gap-6 gap-2 justify-center mt-3">

        {/* Calendario */}
        <div className="w-full lg:w-7/12 p-3 my-card">
          <Calendar
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
          />
        </div>

        {/* Panel de tareas */}
        <div className="w-full lg:w-3/12 flex flex-col gap-2">
          {/* Cada tarjeta ocupa todo el ancho de la columna */}
          <div className="p-3 my-card w-full">
            <section className="mb-1 font-bold">HOY</section>
            {todayItems.length === 0 ? <p>No hay tareas ni eventos</p> : todayItems.map(renderFullCalendarStyle)}
          </div>

          <div className="p-3 my-card w-full">
            <section className="mb-1 font-bold">ESTA SEMANA</section>
            {weekItems.length === 0 ? (
              <p>No hay tareas ni eventos</p>
            ) : (
              Object.entries(
                weekItems.reduce((acc, item) => {
                  const key = ymdLocal(item._date);
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {})
              ).map(([dateStr, items]) => {
                const date = new Date(dateStr);
                const formattedDate = date.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });

                return (
                  <div key={dateStr} className="mb-3">
                    <div className="font-semibold mb-2">{formattedDate}</div>
                    {items.map(renderFullCalendarStyle)}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 my-card w-full">
            <section className="mb-1 font-bold">SIN FECHA</section>
            {noDateTasks.length === 0 ? <p>No hay tareas</p> : noDateTasks.map(renderFullCalendarStyle)}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Inicio;
