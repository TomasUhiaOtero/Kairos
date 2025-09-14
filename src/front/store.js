export const initialStore = () => {
  return {
    calendar: [], // Aquí guardaremos los eventos del calendario
    taskGroup: [], // Aquí guardaremos los grupos de tareas
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    // CALENDAR
    case "ADD_CALENDAR":
      return {
        ...store,
        calendar: [...store.calendar, action.payload], // Añade un evento
      };

    case "UPDATE_CALENDAR":
      return {
        ...store,
        calendar: store.calendar.map((event) =>
          event.id === action.payload.id
            ? { ...event, ...action.payload }
            : event
        ),
      };

    case "DELETE_CALENDAR":
      return {
        ...store,
        calendar: store.calendar.filter(
          (event) => event.id !== action.payload.id
        ),
      };

    // TASKGROUP
    case "ADD_TASKGROUP":
      return {
        ...store,
        taskGroup: [...store.taskGroup, action.payload],
      };

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
        taskGroup: store.taskGroup.filter(
          (group) => group.id !== action.payload.id
        ),
      };
    case "ADD_TASK":
      return {
        ...store,
        taskGroup: [...store.taskGroup, action.payload],
      };
    case "DELETE_TASK":
      return {
        ...store,
        taskGroup: store.taskGroup.filter((task) => task.id !== action.payload),
      };
    default:
      throw Error("Unknown action.");
  }
}
