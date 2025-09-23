// store.js

export const initialStore = () => ({
  calendar: [],                 // Lista de calendarios
  taskGroup: [],                // Lista de grupos de tareas
  events: [],                   // Eventos individuales asignados a calendarios
  tasks: [],                    // Tareas individuales asignadas a grupos
  completedRecurrentTasks: [],  // Instancias completadas de tareas recurrentes
  user: null,                   // Usuario logueado
});

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    /* ======================
       CALENDARS
       ====================== */
    case "ADD_CALENDAR":
      return { ...store, calendar: [...store.calendar, action.payload] };

    case "UPDATE_CALENDAR":
      return {
        ...store,
        calendar: store.calendar.map((cal) =>
          cal.id === action.payload.id ? { ...cal, ...action.payload } : cal
        ),
      };

    case "DELETE_CALENDAR":
      return {
        ...store,
        calendar: store.calendar.filter((cal) => cal.id !== action.payload.id),
        // limpia eventos de ese calendario
        events: store.events.filter(
          (ev) =>
            ev.calendarId !== action.payload.id &&
            ev.calendar_id !== action.payload.id
        ),
      };

    case "SET_CALENDARS":
      return {
        ...store,
        calendar: action.payload.calendars || [],
        events:
          Object.prototype.hasOwnProperty.call(action.payload, "events")
            ? (action.payload.events || [])
            : store.events, // mantiene eventos si no vienen en el payload
      };

    /* ======================
       TASK GROUPS
       ====================== */
    case "ADD_TASKGROUP":
      return { ...store, taskGroup: [...store.taskGroup, action.payload] };

    case "UPDATE_TASKGROUP":
      return {
        ...store,
        taskGroup: store.taskGroup.map((group) =>
          group.id === action.payload.id ? { ...group, ...action.payload } : group
        ),
      };

    case "DELETE_TASKGROUP":
      return {
        ...store,
        taskGroup: store.taskGroup.filter((g) => g.id !== action.payload.id),
        // limpia tareas de ese grupo
        tasks: store.tasks.filter(
          (t) =>
            t.groupId !== action.payload.id &&
            t.task_group_id !== action.payload.id
        ),
      };

    case "SET_TASKGROUPS":
      return {
        ...store,
        taskGroup: action.payload.taskgroup || [],
        tasks: action.payload.tasks || [],
      };

    /* ======================
       EVENTS
       ====================== */
    case "ADD_EVENT":
      return { ...store, events: [...store.events, action.payload] };

    case "UPDATE_EVENT":
      return {
        ...store,
        events: store.events.map((event) =>
          String(event.id) === String(action.payload.id)
            ? { ...event, ...action.payload }
            : event
        ),
      };

    case "DELETE_EVENT":
      return {
        ...store,
        events: store.events.filter((ev) => String(ev.id) !== String(action.payload)),
      };

    // ✅ Upsert (crea o actualiza) — útil para actualización instantánea
    case "UPSERT_EVENT": {
      const incoming = action.payload || {};
      const targetId = String(
        incoming.mode === "edit" ? (incoming.originalId ?? incoming.id) : incoming.id
      );
      const next = {
        ...incoming,
        id: targetId,
        type: "event",
        mode: undefined,
        originalId: undefined,
      };
      const exists = store.events.some((e) => String(e.id) === targetId);
      return {
        ...store,
        events: exists
          ? store.events.map((e) => (String(e.id) === targetId ? next : e))
          : [next, ...store.events],
      };
    }

    /* ======================
       TASKS
       ====================== */
    case "ADD_TASK":
      return { ...store, tasks: [...store.tasks, action.payload] };

    case "UPDATE_TASK":
      return {
        ...store,
        tasks: store.tasks.map((task) =>
          String(task.id) === String(action.payload.id)
            ? { ...task, ...action.payload }
            : task
        ),
      };

    case "SET_TASKS":
      return {
        ...store,
        tasks: Array.isArray(action.payload)
          ? action.payload
          : action.payload?.tasks || [],
      };

    case "DELETE_TASK":
      return {
        ...store,
        tasks: store.tasks.filter((t) => String(t.id) !== String(action.payload)),
      };

    // ✅ Upsert (crea o actualiza) — útil para actualización instantánea
    case "UPSERT_TASK": {
      const incoming = action.payload || {};
      const targetId = String(
        incoming.mode === "edit" ? (incoming.originalId ?? incoming.id) : incoming.id
      );
      const next = {
        ...incoming,
        id: targetId,
        type: "task",
        mode: undefined,
        originalId: undefined,
      };
      const exists = store.tasks.some((t) => String(t.id) === targetId);
      return {
        ...store,
        tasks: exists
          ? store.tasks.map((t) => (String(t.id) === targetId ? next : t))
          : [next, ...store.tasks],
      };
    }

    /* ======================
       USER
       ====================== */
    case "SET_USER":
      return { ...store, user: action.payload };

    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
