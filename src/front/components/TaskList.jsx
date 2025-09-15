import React from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isWithinRange = (date, start, end) => {
  return date >= start && date <= end;
};

const TaskList = ({ filter }) => {
  const { store, dispatch } = useGlobalReducer();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLater = new Date(today);
  weekLater.setDate(today.getDate() + 7);

  // Filtrar tareas
  const filteredTasks = store.tasks.filter((task) => {
    if (!task.date || task.date === "") return filter === "NO_DATE";

    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);

    if (filter === "TODAY") return isSameDay(taskDate, today);
    if (filter === "WEEK") return isWithinRange(taskDate, today, weekLater);
    return false;
  });

  // Filtrar eventos
  const filteredEvents = store.events.filter((event) => {
    if (!event.date || event.date === "") return false;

    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    if (filter === "TODAY") return isSameDay(eventDate, today);
    if (filter === "WEEK") return isWithinRange(eventDate, today, weekLater);
    return false;
  });

  const toggleDone = (task) => {
    dispatch({
      type: "UPDATE_TASK",
      payload: { ...task, done: !task.done },
    });
  };

  return (
    <div>
      {filter === "NO_DATE" && filteredTasks.length === 0 && <p>No hay tareas</p>}
      {filter !== "NO_DATE" &&
        filteredTasks.length === 0 &&
        filteredEvents.length === 0 && <p>No hay tareas ni eventos</p>}

      {filteredTasks.map((task) => (
        <div key={task.id} className="task-item d-flex align-items-center">
          <input
            type="checkbox"
            checked={task.done || false}
            onChange={() => toggleDone(task)}
          />
          <span style={{ marginLeft: "8px" }}>{task.title}</span>
        </div>
      ))}

      {filteredEvents.map((event) => (
        <div key={event.id} className="event-item d-flex align-items-center">
          <span style={{ fontWeight: "bold", color: "#1a73e8" }}>
            {event.title}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
