import React, { useEffect } from "react";
import Calendar from "../components/Calendar";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { apiListUserTaskGroups, apiListCalendars, apiListEvents, getUserId } from "../lib/api.js";


export const Inicio = () => {
    const { store, dispatch } = useGlobalReducer();

    useEffect(() => {
        const getData = async () => {
            // Calendarios
            const listCalendar = await apiListCalendars();

            // Eventos (⬅️ NUEVO)
            const eventsRaw = await apiListEvents();
            const events = Array.isArray(eventsRaw) ? eventsRaw.map(normalizeEventFromServer) : [];

            // Enviar ambos en el mismo dispatch (⬅️ CLAVE: no dejes events como [])
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

            // Tareas (igual que tenías)
            const base = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");
            const token = localStorage.getItem("token");
            const headers = { Authorization: token ? `Bearer ${token}` : undefined, Accept: "application/json" };
            const resp = await fetch(`${base}/api/users/${userId}/tasks`, { headers });
            const tasks = resp.ok ? await resp.json() : [];
            const normalizedTasks = tasks.map(t => ({
                id: t.id,
                type: "task",
                title: t.title,
                groupId: t.task_group_id,
                done: !!t.status,
                startDate: t.date ? String(t.date).slice(0, 10) : null,
            }));
            dispatch({ type: "SET_TASKS", payload: normalizedTasks });
        };

        getData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



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

    // helper para partir ISO en fecha/hora (p.e. "2025-09-22T10:30:00")
    const parseISOToParts = (iso) => {
        if (!iso) return { date: null, time: null };
        const [d, t] = String(iso).split("T");
        return { date: d || null, time: t ? t.slice(0, 5) : null };
    };

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


    return (
        <div className="container-fluid">
            <div className="row">
                {/* Columna vacía solo en pantallas grandes */}
                <div className="d-none d-lg-block col-lg"></div>

                {/* Calendario */}
                <div className="col-12 col-lg-7 p-3 rounded card calendar-container m-3">
                    <Calendar />
                </div>

                {/* Panel de tareas */}
                <div className="col-12 col-lg-3 p-3 m-3">
                    <div className="card p-3 mb-3">
                        <section className="mb-1 font-bold">HOY</section>
                        {todayItems.length === 0 ? <p>No hay tareas ni eventos</p> : todayItems.map(renderFullCalendarStyle)}
                    </div>

                    <div className="card p-3 mb-3">
                        <section className="mb-1 font-bold">ESTA SEMANA</section>
                        {weekItems.length === 0 ? (
                            <p>No hay tareas ni eventos</p>
                        ) : (
                            Object.entries(
                                weekItems.reduce((acc, item) => {
                                    const key = item._date.toISOString().split("T")[0];
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

                    <div className="card p-3">
                        <section className="mb-1 font-bold">SIN FECHA</section>
                        {noDateTasks.length === 0 ? <p>No hay tareas</p> : noDateTasks.map(renderFullCalendarStyle)}
                    </div>
                </div>

                {/* Columna vacía solo en pantallas grandes */}
                <div className="d-none d-lg-block col-lg"></div>
            </div>
        </div>

    );
};

export default Inicio;
