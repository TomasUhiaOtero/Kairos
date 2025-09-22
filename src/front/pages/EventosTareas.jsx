import React, { useMemo } from "react";
import TablaEventos from "../components/TablaEventos";
import Tasks from "../components/Tasks";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const EventosTareas = () => {
  const { store } = useGlobalReducer();

  // Helpers
  const toIsoWithTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    if (!timeStr) return dateStr; // all-day -> solo fecha
    return `${dateStr}T${timeStr}`;
  };

  // Adaptar eventos al formato que espera TablaEventos
  // Tomando el color desde el calendario (igual que FullCalendar)
  const eventosForTable = useMemo(() => {
    return (store.events || []).map((e) => {
      const allDay = !!e.allDay;

      const start_date = allDay
        ? e.startDate || null
        : toIsoWithTime(e.startDate, e.startTime || "00:00");

      const end_date = allDay
        ? e.endDate || e.startDate || null
        : toIsoWithTime(
            e.endDate || e.startDate,
            e.endTime || e.startTime || "00:00"
          );

      const calendarIdNum = Number(e.calendarId);
      const cal = (store.calendar || []).find(
        (c) => Number(c.id) === calendarIdNum
      );
      const color = (e.color && String(e.color).trim()) || cal?.color || "#94a3b8"; // mismo fallback que en Calendar.jsx

      return {
        id: e.id,
        title: e.title,
        start_date,
        end_date,
        color,
        all_day: allDay,
      };
    });
  }, [store.events, store.calendar]);

  const tasksForTable = useMemo(() => {
    return (store.tasks || []).map((t) => ({
      id: t.id,
      text: t.title || t.name,
      status: t.status ?? false,
      repeat: t.recurrencia ?? 0,
      color: t.color || "text-gray-600",
      date: t.date || t.dueDate || t.startDate || null,
    }));
  }, [store.tasks]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Eventos */}
        <div>
          <TablaEventos eventos={eventosForTable} />
        </div>

        {/* Columna derecha: Tareas */}
        <div>
          <Tasks tasks={tasksForTable} />
        </div>
      </div>
    </div>
  );
};

export default EventosTareas;
