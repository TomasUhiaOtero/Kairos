// store.js

export const initialStore = () => ({
  calendar: [], // Lista de calendarios
  taskGroup: [], // Lista de grupos de tareas
  events: [], // Eventos individuales asignados a calendarios
  tasks: [], // Tareas individuales asignadas a grupos
  completedRecurrentTasks: [], // Instancias completadas de tareas recurrentes
  user: null, // Usuario logueado
});

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    // CALENDAR
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
    events: store.events.filter(
      (ev) =>
        ev.calendarId !== action.payload.id && ev.calendar_id !== action.payload.id
    ),
  };

    case "SET_CALENDARS":
      return {
        ...store,
        calendar: action.payload.calendars || [],
        events: action.payload.events || [],
      };

    // TASKGROUPS
    case "ADD_TASKGROUP":
      return { ...store, taskGroup: [...store.taskGroup, action.payload] };

    case "UPDATE_TASKGROUP":
      return {
        ...store,
        taskGroup: store.taskGroup.map((group) =>
          group.id === action.payload.id ? { ...group, ...action.payload } : group
        ),
      }

    case "DELETE_TASKGROUP":
  return {
    ...store,
    taskGroup: store.taskGroup.filter((g) => g.id !== action.payload.id),
    tasks: store.tasks.filter(
      (t) => t.groupId !== action.payload.id && t.task_group_id !== action.payload.id
    ),
  };

    case "SET_TASKGROUPS":
      return {
        ...store,
        taskGroup: action.payload.taskgroup || [],
        tasks: action.payload.tasks || [],
      };

    // EVENTS
    case "ADD_EVENT":
      return { ...store, events: [...store.events, action.payload] };

    case "UPDATE_EVENT":
      return {
        ...store,
        events: store.events.map((event) =>
          event.id === action.payload.id
            ? { ...event, ...action.payload }
            : event
        ),
      };

    case "DELETE_EVENT":
      return {
        ...store,
        events: store.events.filter((ev) => ev.id !== action.payload),
      };

    // TASKS
    case "ADD_TASK":
      return { ...store, tasks: [...store.tasks, action.payload] };

    case "UPDATE_TASK":
      return {
        ...store,
        tasks: store.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, ...action.payload } : task
        ),
      };

    case "DELETE_TASK":
      return {
        ...store,
        tasks: store.tasks.filter((t) => t.id !== action.payload),
      };

    // USER
    case "SET_USER":
      return { ...store, user: action.payload };

    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
