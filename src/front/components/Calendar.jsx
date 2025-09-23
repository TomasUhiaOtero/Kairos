import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import CreateEvent from './CreateEvent';
import useGlobalReducer from '../hooks/useGlobalReducer.jsx';
import { apiUpdateUserTask, apiDeleteUserTask, apiCreateEvent, apiUpdateEvent, apiDeleteEvent, getUserId } from "../lib/api.js";
const Calendar = () => {
  const { store, dispatch } = useGlobalReducer();
  const calendarRef = useRef(null);
  const [popover, setPopover] = useState(null);
  const [title, setTitle] = useState('');
  const [isCompact, setIsCompact] = useState(window.innerWidth < 640);
  const defaultCalendarId = store.calendar[0]?.id || null;

  // helper: HH:mm sin AM/PM
  const formatTime = (d) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "";


  // --- Utilidades ---
  const getLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reemplaza tu formatItemDates por este
  const formatItemDates = (item) => {
    if (item.type === "event") {
      const allDay = !!item.allDay;

      // Para all-day, FullCalendar espera solo YYYY-MM-DD
      if (allDay) {
        return {
          ...item,
          start: item.startDate,                                // "YYYY-MM-DD"
          end: item.endDate || item.startDate || undefined,     // mismo día si no viene
        };
      }

      // Con horas: unimos fecha + hora si hay startTime/endTime
      const start =
        item.startTime
          ? `${item.startDate}T${item.startTime}`               // "YYYY-MM-DDTHH:MM"
          : item.startDate;                                     // fallback

      const endBase = item.endDate || item.startDate;
      const end =
        item.endTime
          ? `${endBase}T${item.endTime}`
          : (endBase
            ? `${endBase}T${item.startTime || "00:00"}`
            : undefined);

      return { ...item, start, end };
    }

    // Tasks: igual que antes
    return {
      ...item,
      start: item.startDate || undefined,
      end: undefined,
      extendedStartTime: item.startTime || ''
    };
  };


  // Pequeño ajuste para evitar undefined en colores
  const getCalendarsColors = () => {
    const obj = {};
    store.calendar.forEach(cal => {
      obj[cal.id] = {
        background: (cal.color || '#94a3b8') + '30',
        border: (cal.color || '#94a3b8') + '00',
        text: cal.color || '#334155',
      };
    });
    return obj;
  };


  const getTaskGroupsColors = () => {
    const obj = {};
    store.taskGroup.forEach(group => {
      obj[group.id] = {
        background: '#ffffff00',
        border: group.color,
        text: group.color,
      };
    });
    return obj;
  };
  

  const calendarsColors = getCalendarsColors();
  const taskGroupsColors = getTaskGroupsColors();

  // --- CRUD --- (modificado max para actualixar al momento y no recargar la pajina)
  const handleAddItem = async (item) => {
    if (!item.title?.trim()) return;

    const isEvent = item.type === 'event';

    if (isEvent) {
      // --- Eventos (igual que antes) ---
      const isUpdate = !!item.id;
      if (isUpdate) {
        const optimistic = { ...item, id: String(item.id) };
        dispatch({ type: "UPDATE_EVENT", payload: optimistic });
        try {
          const body = toBackendEventBody(optimistic);
          const data = await apiUpdateEvent(optimistic.id, body);
          const normalized = normalizeEventFromServer(data);
          dispatch({ type: "UPDATE_EVENT", payload: normalized });
        } catch (e) {
          dispatch({ type: "UPDATE_EVENT", payload: item });
          console.error("Error guardando evento:", e);
          alert(e?.message || "No se pudo guardar el evento");
        }
        setPopover(null);
        return;
      }

      // Crear nuevo evento
      const tempId = (Date.now() + Math.random()).toString();
      const optimistic = { ...item, id: tempId };
      dispatch({ type: "ADD_EVENT", payload: optimistic });
      try {
        const body = toBackendEventBody(optimistic);
        const data = await apiCreateEvent(body);
        const normalized = normalizeEventFromServer(data);
        dispatch({ type: "DELETE_EVENT", payload: tempId });
        dispatch({ type: "ADD_EVENT", payload: normalized });
      } catch (e) {
        dispatch({ type: "DELETE_EVENT", payload: tempId });
        console.error("Error guardando evento:", e);
        alert(e?.message || "No se pudo guardar el evento");
      }
      setPopover(null);
      return;
    }

    // --- Tareas ---
    const taskId = item.originalId ?? item.id; // <--- usar originalId si existe
    const formattedItem = { ...item, id: String(taskId) };
    const exists = store.tasks.some(x => String(x.id) === formattedItem.id);

    if (exists) {
      // Actualizar tarea
      dispatch({ type: "UPDATE_TASK", payload: formattedItem });

      const userId = getUserId({ storeUser: store.user });
      if (userId) {
        const iso = formattedItem.startTime
          ? `${formattedItem.startDate}T${formattedItem.startTime}:00`
          : `${formattedItem.startDate}T00:00:00`;
        try {
          await apiUpdateUserTask(Number(userId), Number(formattedItem.id), {
            title: formattedItem.title,
            date: iso,
          });
        } catch (e) {
          console.error("Error actualizando tarea:", e);
          alert(e?.message || "No se pudo actualizar la tarea");
        }
      }
    } else {
      // Crear nueva tarea
      const tempId = (Date.now() + Math.random()).toString();
      dispatch({ type: "ADD_TASK", payload: { ...formattedItem, id: tempId } });
    }

    setPopover(null);
  };



  // MODIFICADO: borrar EVENTO con API + rollback
  const handleDeleteItem = async (itemId, itemType) => {
    if (!itemId) return;

    if (itemType === "event") {
      const prev = store.events.find(e => String(e.id) === String(itemId));

      // Optimistic
      dispatch({ type: "DELETE_EVENT", payload: itemId });
      setPopover(null);

      try {
        await apiDeleteEvent(Number(itemId));
      } catch (e) {
        // Rollback
        if (prev) dispatch({ type: "ADD_EVENT", payload: prev });
        console.error("Error borrando evento:", e);
        alert(e?.message || "No se pudo borrar el evento");
      }
      return;
    }

    // --- TAREA (tu flujo actual)
    const userId = getUserId({ storeUser: store.user });
    if (!userId) {
      alert("No se pudo identificar al usuario.");
      return;
    }

    const taskToDelete = store.tasks.find(t => String(t.id) === String(itemId));

    dispatch({ type: "DELETE_TASK", payload: itemId });
    setPopover(null);

    try {
      await apiDeleteUserTask(Number(userId), Number(itemId));
    } catch (e) {
      if (taskToDelete) dispatch({ type: "ADD_TASK", payload: taskToDelete });
      console.error("Error borrando tarea:", e);
      alert(e?.message || "No se pudo borrar la tarea");
    }
  };




  const toggleTaskDone = async (taskId) => {
    const existingTask = store.tasks.find(t => String(t.id) === String(taskId));
    if (!existingTask) return;

    const userId = getUserId({ storeUser: store.user });
    if (!userId) {
      alert("No se pudo identificar al usuario.");
      return;
    }

    const newDone = !existingTask.done;

    // Optimistic update
    dispatch({
      type: "UPDATE_TASK",
      payload: { ...existingTask, done: newDone }
    });

    try {
      await apiUpdateUserTask(userId, Number(taskId), { status: newDone });
    } catch (e) {
      // Rollback si falla
      dispatch({
        type: "UPDATE_TASK",
        payload: { ...existingTask, done: !newDone }
      });
      console.error("No se pudo guardar el cambio de estado:", e);
      alert(e?.message || "No se pudo guardar el estado de la tarea");
    }
  };

  // NUEVO: partir ISO en fecha/hora
  const parseISOToParts = (iso) => {
    if (!iso) return { date: null, time: null };
    const [d, t] = String(iso).split('T');
    return { date: d, time: t ? t.slice(0, 5) : null };
  };

  // NUEVO: construir body para el backend de eventos
  // Reemplaza tu toBackendEventBody por este:
  const toBackendEventBody = (evt) => {
    const allDay = !!evt.allDay;

    // Separar fecha y hora si startDate/endDate ya venían con "T..."
    const s = parseISOToParts(evt.startDate);
    const e = parseISOToParts(evt.endDate || evt.startDate);

    const startDate = s.date;                 // "YYYY-MM-DD"
    const endDate = e.date;                 // "YYYY-MM-DD" (fallback al start)

    // Si es allDay no enviamos hora. Si no, prioridad:
    // 1) hora explícita del form (startTime/endTime)
    // 2) hora que ya venía embebida en startDate/endDate
    // 3) fallback "00:00" (y para end, fallback a startTime)
    const startTime = allDay ? '' : (evt.startTime || s.time || '00:00');
    const endTime = allDay ? '' : (evt.endTime || e.time || startTime || '00:00');

    const startIso = startTime ? `${startDate}T${startTime}` : startDate;
    const endIso = endTime ? `${endDate}T${endTime}` : endDate;

    const calendarIdNum = Number(evt.calendarId || defaultCalendarId);
    const cal = store.calendar.find(c => Number(c.id) === calendarIdNum);
    const safeColor = (evt.color ?? cal?.color ?? "");

    return {
      title: evt.title?.trim(),
      calendar_id: calendarIdNum,
      start_date: startIso,
      end_date: endIso,
      all_day: allDay,
      description: (evt.description ?? ""), // nunca null
      color: (safeColor ?? ""),             // nunca null
    };
  };


  // NUEVO: normalizar respuesta del backend -> shape del store
  const normalizeEventFromServer = (server) => {
    const s = String(server.start_date || "");
    const e = String(server.end_date || "");
    const { date: sDate, time: sTime } = parseISOToParts(s);
    const { date: eDate, time: eTime } = parseISOToParts(e);

    return {
      id: String(server.id),
      type: "event",
      title: server.title,
      calendarId: server.calendar_id,
      startDate: sDate || null,
      endDate: eDate || sDate || null,
      startTime: server.all_day ? "" : (sTime || ""),
      endTime: server.all_day ? "" : (eTime || ""),
      allDay: !!server.all_day,
      description: server.description || "",
      color: server.color || "",
    };
  };


  // --- Drag & Resize ---
  // MODIFICADO: al mover/redimensionar EVENTO, persiste en backend
  const handleEventDrop = async (info) => {
    const { type, originalId } = info.event.extendedProps; // 👈 el id real
    const { start, end, allDay } = info.event;

    const updatedItem = type === 'event'
      ? store.events.find(e => String(e.id) === String(originalId))
      : store.tasks.find(t => String(t.id) === String(originalId));

    if (!updatedItem) return;

    const payload = {
      ...updatedItem,
      startDate: getLocalDateString(start),
      endDate: type === 'event'
        ? (end ? getLocalDateString(end) : getLocalDateString(start))
        : undefined,
      startTime: type === 'event'
        ? (!allDay && start ? start.toTimeString().slice(0, 5) : '')
        : (updatedItem.startTime || ''),
      endTime: type === 'event'
        ? (!allDay && end ? end.toTimeString().slice(0, 5) : '')
        : '',
      allDay: type === 'event' ? allDay : false,
    };

    // Optimistic update
    dispatch({
      type: type === 'event' ? "UPDATE_EVENT" : "UPDATE_TASK",
      payload
    });

    if (type === 'task') {
      const userId = getUserId({ storeUser: store.user });
      if (userId) {
        const iso = payload.startTime
          ? `${payload.startDate}T${payload.startTime}:00`
          : `${payload.startDate}T00:00:00`;
        try {
          await apiUpdateUserTask(Number(userId), Number(originalId), { date: iso });
        } catch (e) {
          dispatch({ type: "UPDATE_TASK", payload: updatedItem }); // rollback
          console.error("No se pudo guardar el cambio de día de la tarea:", e);
          alert(e?.message || "No se pudo guardar la tarea");
        }
      }
    }

    if (type === 'event') {
      try {
        const body = toBackendEventBody(payload);
        const data = await apiUpdateEvent(Number(originalId), body);
        const normalized = normalizeEventFromServer(data);
        dispatch({ type: "UPDATE_EVENT", payload: normalized });
      } catch (e) {
        console.error("No se pudo guardar el movimiento del evento:", e);
        alert(e?.message || "No se pudo guardar el evento");
      }
    }

    // reflejar en FullCalendar
    info.event.setStart(payload.startDate);
    info.event.setEnd(payload.endDate);
  };


  const handleEventResize = handleEventDrop;


  // --- Popover ---
  const handleDateClick = (arg) => {
    const rect = arg.dayEl.getBoundingClientRect();
    let popoverWidth = 300, popoverHeight = 400;
    let x = rect.left + rect.width / 2 - popoverWidth / 2;
    let y = rect.top - popoverHeight - 10;
    if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
    if (x < 0) x = 10;
    if (y < 0) y = rect.bottom + 10;

    setPopover({
      x, y,
      item: {
        type: 'event',
        startDate: arg.dateStr,
        endDate: arg.dateStr,
        allDay: true,
        calendarId: defaultCalendarId,
      },
    });
  };

  const handleEventClick = (clickInfo) => {
    const { type, originalId } = clickInfo.event.extendedProps;
    console.log(originalId);
    const updatedItem = type === 'event'
      ? store.events.find(e => e.id === String(originalId))
      : store.tasks.find(t => t.id === originalId);
    console.log(updatedItem);
    if (!updatedItem) return;

    if (type === 'event') {
      const rect = clickInfo.jsEvent.target.getBoundingClientRect();
      let popoverWidth = 300, popoverHeight = 400;
      let x = rect.left + rect.width / 2 - popoverWidth / 2;
      let y = rect.top - popoverHeight - 10;
      if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
      if (x < 0) x = 10;
      if (y < 0) y = rect.bottom + 10;

      setPopover({ x, y, item: { ...updatedItem, calendarId: updatedItem.calendarId || defaultCalendarId } });
    } else if (type === 'task') {
      const rect = clickInfo.jsEvent.target.getBoundingClientRect();
      let popoverWidth = 300, popoverHeight = 400;
      let x = rect.left + rect.width / 2 - popoverWidth / 2;
      let y = rect.top - popoverHeight - 10;
      if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
      if (x < 0) x = 10;
      if (y < 0) y = rect.bottom + 10;

      setPopover({
        x, y,
        item: {
          ...updatedItem,
          originalId: updatedItem.id, // <--- importante
        }
      });
    }
  };



  // --- Toolbar ---
  const updateTitle = () => setTitle(calendarRef.current?.getApi().view.title || '');
  const goPrev = () => { calendarRef.current?.getApi().prev(); updateTitle(); };
  const goNext = () => { calendarRef.current?.getApi().next(); updateTitle(); };
  const goToday = () => { calendarRef.current?.getApi().today(); updateTitle(); };
  const handleViewChange = (e) => { calendarRef.current?.getApi().changeView(e.target.value); updateTitle(); };

  const allItems = [
    ...store.events.map(e => ({ ...e, type: 'event' })),
    ...store.tasks.map(t => ({ ...t, type: 'task' }))
  ];



  // --- Renderizado ---
  const renderEventContent = (eventInfo) => {
    const { type, groupId } = eventInfo.event.extendedProps;

    if (isCompact) {
      const color = type === "task"
        ? taskGroupsColors[groupId]?.border || "#000"
        : calendarsColors[eventInfo.event.extendedProps.calendarId]?.background || "#000";

      return (
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: color,
            margin: "auto",
          }}
        />
      );
    }

    // --- Render normal (tu código actual) ---
    const { done, id, extendedStartTime } = eventInfo.event.extendedProps;
    const isAllDay = eventInfo.event.allDay;

    if (type === "task") {
      const color = taskGroupsColors[groupId]?.border || "#000";
      const displayTime = !isAllDay && extendedStartTime ? extendedStartTime : "";
      return (
        <div className="flex items-center gap-2" style={{ padding: "4px 6px" }}>
          <div
            onClick={(e) => { e.stopPropagation(); toggleTaskDone(id); }}
            style={{
              width: "1em", height: "1em", minWidth: "12px", minHeight: "12px",
              borderRadius: "50%", border: `0.1em solid ${color}`,
              backgroundColor: done ? color : "transparent",
              cursor: "pointer", flexShrink: 0
            }}
          />
          {displayTime && <span style={{ marginRight: "0.3em", fontWeight: "bold" }}>{displayTime}</span>}
          <span style={{ textDecoration: done ? "line-through" : "none" }}>
            {eventInfo.event.title}
          </span>
        </div>
      );
    }

    
    const endStr = !isAllDay
    ? (eventInfo.event.end ? formatTime(eventInfo.event.end) : (eventInfo.event.extendedProps.endTime || ""))
    : "";
    
    const startStr = !isAllDay
  ? (eventInfo.event.start ? formatTime(eventInfo.event.start) : (eventInfo.event.extendedProps.startTime || ""))
  : "";

return (
  <div style={{ padding: "4px 6px" }}>
    {startStr && (
      <span style={{ marginRight: "0.3em", fontWeight: "bold" }}>
        {startStr}
      </span>
    )}
    {eventInfo.event.title}
  </div>
);
  };

  // USE EFFECT ---------------------------
  useEffect(() => {
    const closePopover = (e) => {
      if (popover && !e.target.closest('.popover-form')) setPopover(null);
    };
    document.addEventListener('mousedown', closePopover);
    return () => document.removeEventListener('mousedown', closePopover);
  }, [popover]);
  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 640); // cambia 640 a tu breakpoint deseado
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div>
      <div className="custom-toolbar flex justify-between mb-2 items-center">
        <div className="left-controls flex gap-1 items-center">
          <button onClick={goPrev} className="fc-button fc-button-primary fc-icon fc-icon-chevron-left" />
          <button onClick={goToday} className="fc-button fc-button-primary text-emerald-700">Hoy</button>
          <button onClick={goNext} className="fc-button fc-button-primary fc-icon fc-icon-chevron-right" />
        </div>
        <div className="center-title font-bold">{title}</div>
        <div className="right-controls">
          <select className="form-select text-emerald-700" onChange={handleViewChange}>
            <option value="dayGridMonth">Mes</option>
            <option value="timeGridWeek">Semana</option>
          </select>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={false}
        footerToolbar={false}
        droppable={true}
        events={allItems.map(item => {
          const formattedItem = formatItemDates(item);
          const { start, end, type, calendarId, groupId, ...rest } = formattedItem;
          const colors = type === 'event'
            ? calendarsColors[calendarId] || { background: '#f3f4f6', border: '#6b7280', text: '#374151' }
            : taskGroupsColors[groupId] || { background: '#f3f4f6', border: '#6b7280', text: '#374151' };
          return {
            start,
            end,
            title: item.title,
            allDay: item.allDay ?? false,
            backgroundColor: colors.background,
            borderColor: colors.border,
            textColor: colors.text,
            id: `${type}-${item.id}`, // único para FullCalendar
            extendedProps: {
              originalId: item.id,
              type,
              calendarId: type === 'event' ? calendarId || defaultCalendarId : undefined,
              groupId: type === 'task' ? groupId : undefined,
              done: item.done ?? false,
              ...rest
            },

            display: 'block',
            startEditable: true,
            durationEditable: type === 'event',
            editable: true,
          };
        })}
        eventDidMount={(info) => {
          if (info.event.extendedProps.type === "task") {
            // Aplica borde y fondo al <a>
            info.el.style.borderRadius = "16px";
            info.el.style.overflow = "hidden";
            info.el.style.backgroundColor = "#fff"; // o rgba si quieres semitransparente
            info.el.style.border = `1px solid ${info.event.extendedProps.groupColor || '#5a8770'}`;

            // También aplica a fc-event-main para que el contenido respete el borde
            const main = info.el.querySelector('.fc-event-main');
            if (main) {
              main.style.borderRadius = "16px";
              main.style.overflow = "hidden";
            }
          }
        }}
        dayCellDidMount={(info) => {
          if (info.isToday) {
            const numberEl = info.el.querySelector(".fc-daygrid-day-number, .fc-col-header-cell-cushion");
            if (numberEl) {
              numberEl.classList.add(
                "bg-red-500",
                "text-white",
                "rounded-full",
                "w-7",
                "h-7",
                "flex",
                "items-center",
                "justify-center",
                "ms-auto",
                "font-semibold"
              );
            }
          }
        }}
        windowResize={(arg) => {
          if (window.innerWidth < 640 && arg.view.type === "dayGridMonth") {
            arg.view.calendar.setOption("eventDisplay", "none");
          } else {
            arg.view.calendar.setOption("eventDisplay", "block");
          }
        }}
        fixedWeekCount={false}   // 👈 no fuerza siempre 6 semanas
        contentHeight="auto"
        displayEventTime
        eventContent={renderEventContent}
        dateClick={handleDateClick}
        selectable
        datesSet={updateTitle}
        height="75vh"
        expandRows
        nowIndicator
        dayMaxEvents={true}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
      />

      {popover && (
        <div
          className="popover bs-popover-top show position-absolute popover-form form-appear bg-white/30 backdrop-blur-md p-6 rounded-lg shadow-lg p-0"
          style={{
            top: isCompact ? 60 : popover.y,        // distancia desde arriba en móvil
            left: isCompact ? 12 : popover.x,       // margen lateral izquierdo
            right: isCompact ? 12 : 'auto',         // margen lateral derecho
            zIndex: 2000,
            width: isCompact ? 'auto' : 'auto',     // ancho automático, respetando márgenes
            maxWidth: isCompact ? 'calc(100% - 24px)' : 500, // ancho máximo considerando márgenes
            minWidth: isCompact ? 'calc(100% - 24px)' : 320,
          }}
        >
          <div className="popover-arrow" style={{ display: isCompact ? 'none' : 'block' }}></div>
          <div className="popover-body">
            <CreateEvent
              selectedDate={popover.item.startDate || popover.item.start}
              onAddItem={handleAddItem}
              onDeleteItem={(itemId) => handleDeleteItem(itemId, popover.item.type)}
              item={popover.item}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
