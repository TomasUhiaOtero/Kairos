import React, { useEffect } from "react";
import Calendar from "../components/Calendar";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { apiListTaskGroups, apiListCalendars } from "../lib/api.js"

export const Inicio = () => {
    const { store, dispatch } = useGlobalReducer();

    useEffect(() => {
        const getData = async () => {
            const listTaskGroup = await apiListTaskGroups()
            const listCalendar = await apiListCalendars()
            dispatch({
                type: "SET_CALENDARS",
                payload: { calendars: listCalendar },
            });
            dispatch({
                type: "SET_TASKGROUPS",
                payload: { taskgroup: listTaskGroup },
            });
            console.log(listTaskGroup)
        }
        getData()

    }, [])

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);

    const normalizeDate = (d) => {
        if (!d) return null;
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const tasks = store.tasks.map(t => ({
        ...t,
        type: "task",
        _date: normalizeDate(t.startDate || t.start)
    }));
    const events = store.events.map(e => ({
        ...e,
        type: "event",
        _date: normalizeDate(e.startDate || e.start)
    }));

    const noDateTasks = tasks.filter(t => !t._date);
    const todayItems = [...tasks, ...events].filter(i => i._date?.getTime() === today.getTime());
    const weekItems = [...tasks, ...events].filter(i => i._date && i._date > today && i._date <= weekLater);

    const getItemColor = (item) => {
        if (item.type === "task") {
            const group = store.taskGroup.find(g => g.id === item.groupId);
            return group?.color || "#2563eb";
        }
        if (item.type === "event") {
            const cal = store.calendar.find(c => c.id === item.calendarId);
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
                style={item.type === "event" ? { backgroundColor: `${color}30`, color: color } : { color: color }}
            >
                {item.type === "task" && (
                    <div
                        className={`check ${item.done ? "done" : ""}`}
                        onClick={() => toggleTaskDone(item)}
                        style={{ borderColor: color, backgroundColor: item.done ? color : 'transparent' }}
                    />
                )}

                {displayTime && <span style={{ marginLeft: 4, fontWeight: 'semi-bold' }}>{displayTime}</span>}
                <span style={{ marginLeft: 4, textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.title}
                </span>
            </div>
        );
    };

    return (
        <div className="row h-100">
            <div className="col"></div>

            <div className="col-7 p-3 rounded card calendar-container">
                <Calendar />
            </div>

            <div className="col-3 p-3">
                <section className="mb-1 font-bold">HOY</section>
                <div className="card p-3 mb-3">
                    {todayItems.length === 0 ? <p>No hay tareas ni eventos</p> : todayItems.map(renderFullCalendarStyle)}
                </div>

                <section className="mb-1 font-bold">ESTA SEMANA</section>
                <div className="card p-3 mb-3">
                    {weekItems.length === 0 ? (
                        <p>No hay tareas ni eventos</p>
                    ) : (
                        // Agrupar items por fecha
                        Object.entries(
                            weekItems.reduce((acc, item) => {
                                const key = item._date.toISOString().split("T")[0]; // 'YYYY-MM-DD'
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

                <section className="mb-1 font-bold">SIN FECHA</section>
                <div className="card p-3">
                    {noDateTasks.length === 0 ? <p>No hay tareas</p> : noDateTasks.map(renderFullCalendarStyle)}
                </div>
            </div>

            <div className="col"></div>
        </div>
    );
};

export default Inicio;
