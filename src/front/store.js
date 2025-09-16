export const initialStore = () => {
  return {
    calendar: [], // Lista de calendarios
    taskGroup: [], // Lista de grupos de tareas
    events: [], // Eventos individuales asignados a calendarios
    tasks: [], // Tareas individuales asignadas a grupos
    completedRecurrentTasks: [], // Instancias completadas de tareas recurrentes
  };
};

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
          (ev) => ev.calendarId !== action.payload.id
        ), // elimina eventos asociados
      };

    // TASKGROUPS
    case "ADD_TASKGROUP":
      return { ...store, taskGroup: [...store.taskGroup, action.payload] };

    case "UPDATE_TASKGROUP":
      return {
        ...store,
        taskGroup: store.taskGroup.map((group) =>
          group.id === action.payload.id
            ? { ...group, ...action.payload }
            : group
        ),
      };

    case "DELETE_TASKGROUP":
      return {
        ...store,
        taskGroup: store.taskGroup.filter((g) => g.id !== action.payload.id),
        tasks: store.tasks.filter((t) => t.groupId !== action.payload.id), // elimina tareas asociadas
      };

    // EVENTOS
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

    // TAREAS
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

    // TAREAS RECURRENTES - Marcar instancia específica como completada
    case "COMPLETE_RECURRENT_TASK_INSTANCE":
      const { originalId, instanceDate } = action.payload;
      const existingCompleted = store.completedRecurrentTasks.find(
        c => c.originalId === originalId && c.instanceDate === instanceDate
      );

      if (existingCompleted) {
        // Si ya existe, la removemos (toggle off)
        return {
          ...store,
          completedRecurrentTasks: store.completedRecurrentTasks.filter(
            c => !(c.originalId === originalId && c.instanceDate === instanceDate)
          )
        };
      } else {
        // Si no existe, la agregamos (toggle on)
        return {
          ...store,
          completedRecurrentTasks: [
            ...store.completedRecurrentTasks,
            { originalId, instanceDate, completedAt: new Date().toISOString() }
          ]
        };
      }

    // LIMPIAR instancias completadas huérfanas (cuando se elimina la tarea original)
    case "CLEANUP_ORPHANED_COMPLETED_INSTANCES":
      const validTaskIds = store.tasks.map(t => t.id);
      return {
        ...store,
        completedRecurrentTasks: store.completedRecurrentTasks.filter(
          c => validTaskIds.includes(c.originalId)
        )
      };

    default:
      throw new Error("Unknown action.");
  }
}