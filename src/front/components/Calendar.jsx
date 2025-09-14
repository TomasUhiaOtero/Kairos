import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import CreateEvent from './CreateEvent';
import useGlobalReducer from '../hooks/useGlobalReducer.jsx';

const Calendar = () => {
    const { store, dispatch } = useGlobalReducer();
    const calendarRef = useRef(null);
    const [popover, setPopover] = useState(null);
    const [title, setTitle] = useState('');

    // --- Utilidades ---
    const getLocalDateString = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatItemDates = (item) => {
        let start, end;
        if (item.type === "event") {
            if (item.allDay) {
                start = item.startDate;
                end = item.endDate || undefined; // No sumar días
            } else {
                start = `${item.startDate}T${item.startTime || "09:00"}`;
                end = `${item.endDate || item.startDate}T${item.endTime || "10:00"}`;
            }
        } else {
            start = `${item.startDate}T${item.startTime || "09:00"}`;
            end = `${item.startDate}T${item.startTime || "09:00"}`;
        }
        return { ...item, start, end };
    };

    const getCalendarsColors = () => {
        const obj = {};
        store.calendar.forEach(cal => {
            obj[cal.id] = {
                background: cal.color + '30',
                border: cal.color + '00',
                text: cal.color,
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

    // --- CRUD ---
    const handleAddItem = (item) => {
        if (!item.title?.trim()) return;

        const formattedItem = formatItemDates({
            ...item,
            id: item.id || Date.now() + Math.random(),
        });

        if (item.type === 'event') {
            dispatch({
                type: item.id ? "UPDATE_EVENT" : "ADD_EVENT",
                payload: formattedItem
            });
        } else if (item.type === 'task') {
            dispatch({
                type: item.id ? "UPDATE_TASK" : "ADD_TASK",
                payload: formattedItem
            });
        }

        setPopover(null);
    };

    const handleDeleteItem = (itemId, itemType) => {
        if (!itemId) return;
        dispatch({ type: itemType === 'event' ? "DELETE_EVENT" : "DELETE_TASK", payload: itemId });
        setPopover(null);
    };

    const toggleTaskDone = (taskId) => {
        const existingTask = store.tasks.find(t => t.id === taskId);
        if (existingTask) {
            dispatch({
                type: "UPDATE_TASK",
                payload: { ...existingTask, done: !existingTask.done }
            });
        }
    };

    // --- Drag & Resize ---
    const handleEventDrop = (info) => {
        const { id, start, end, allDay } = info.event;
        const itemType = info.event.extendedProps.type;

        const updatedItem = {
            id,
            startDate: getLocalDateString(start),
            endDate: end ? getLocalDateString(end) : getLocalDateString(start),
            startTime: !allDay && start ? start.toTimeString().slice(0, 5) : '',
            endTime: !allDay && end ? end.toTimeString().slice(0, 5) : '',
            allDay: itemType === 'event' ? allDay : false,
        };

        const existing = itemType === 'event'
            ? store.events.find(e => e.id === id)
            : store.tasks.find(t => t.id === id);

        if (existing) {
            dispatch({
                type: itemType === 'event' ? "UPDATE_EVENT" : "UPDATE_TASK",
                payload: { ...existing, ...updatedItem }
            });
        }
        if (type === 'task') {
            const task = store.tasks.find(t => t.id === id);
            if (task) {
                const updatedTask = {
                    ...task,
                    startDate: getLocalDateString(start),
                    endDate: getLocalDateString(start),
                };
                dispatch({ type: "UPDATE_TASK", payload: updatedTask });
            }
        }
    };

    const handleEventResize = handleEventDrop; // mismo manejo

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
                calendarId: store.calendar[0]?.id,
            },
        });
    };

    // --- Toolbar ---
    const updateTitle = () => setTitle(calendarRef.current?.getApi().view.title || '');
    const goPrev = () => { calendarRef.current?.getApi().prev(); updateTitle(); };
    const goNext = () => { calendarRef.current?.getApi().next(); updateTitle(); };
    const goToday = () => { calendarRef.current?.getApi().today(); updateTitle(); };
    const handleViewChange = (e) => { calendarRef.current?.getApi().changeView(e.target.value); updateTitle(); };

    // --- Renderizado ---
    const renderEventContent = (eventInfo) => {
        const { type, groupId, done, id, extendedStartTime } = eventInfo.event.extendedProps;
        const isAllDay = eventInfo.event.allDay;

        if (type === 'task') {
            const color = taskGroupsColors[groupId]?.border || '#000';
            const displayTime = !isAllDay && extendedStartTime ? extendedStartTime : '';
            return (
                <div className="flex items-center gap-2" style={{ padding: '4px 6px' }}>
                    <div
                        onClick={(e) => { e.stopPropagation(); toggleTaskDone(id); }}
                        style={{
                            width: '1em', height: '1em', minWidth: '12px', minHeight: '12px',
                            borderRadius: '50%', border: `0.1em solid ${color}`,
                            backgroundColor: done ? color : 'transparent',
                            cursor: 'pointer', flexShrink: 0
                        }}
                    />
                    {displayTime && <span style={{ marginRight: '0.3em', fontWeight: 'bold' }}>{displayTime}</span>}
                    <span style={{ textDecoration: done ? 'line-through' : 'none' }}>
                        {eventInfo.event.title}
                    </span>
                </div>
            );
        } else {
            const startTimeDisplay = !isAllDay && eventInfo.event.start
                ? eventInfo.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                : '';
            return (
                <div style={{ padding: '4px 6px' }}>
                    {startTimeDisplay && <span style={{ marginRight: '0.3em', fontWeight: 'bold' }}>{startTimeDisplay}</span>}
                    {eventInfo.event.title}
                </div>
            );
        }
    };
    const handleEventClick = (clickInfo) => {
        const { event } = clickInfo;
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
                id: event.id,
                title: event.title,
                type: event.extendedProps.type,
                startDate: getLocalDateString(event.start),
                endDate: event.end ? getLocalDateString(event.end) : getLocalDateString(event.start),
                startTime: !event.allDay && event.start ? event.start.toTimeString().slice(0, 5) : '',
                endTime: !event.allDay && event.end ? event.end.toTimeString().slice(0, 5) : '',
                allDay: event.allDay,
                calendarId: event.extendedProps.calendarId,
                groupId: event.extendedProps.groupId,
                done: event.extendedProps.done || false,
                ...event.extendedProps
            }
        });
    };
    useEffect(() => {
        const closePopover = (e) => {
            if (popover && !e.target.closest('.popover-form')) setPopover(null);
        };
        document.addEventListener('mousedown', closePopover);
        return () => document.removeEventListener('mousedown', closePopover);
    }, [popover]);

    const allItems = [
        ...store.events.map(event => ({ ...event, type: 'event' })),
        ...store.tasks.map(task => ({ ...task, type: 'task' }))
    ];

    return (
        <div>
            <div className="custom-toolbar flex justify-between mb-2">
                <div className="left-controls flex gap-1 items-center">
                    <button onClick={goPrev} className="fc-button fc-button-primary fc-icon fc-icon-chevron-left" />
                    <button onClick={goToday} className="fc-button fc-button-primary">Hoy</button>
                    <button onClick={goNext} className="fc-button fc-button-primary fc-icon fc-icon-chevron-right" />
                </div>
                <div className="center-title font-bold">{title}</div>
                <div className="right-controls">
                    <select className="form-select" onChange={handleViewChange}>
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
                        id: item.id,
                        start,
                        end,
                        title: item.title,
                        allDay: item.allDay ?? false, // <-- nunca forzar true para tareas
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        textColor: colors.text,
                        extendedProps: { ...rest, type, calendarId, groupId },
                        display: 'block',
                        startEditable: true,
                        durationEditable: type === 'event',
                        editable: true,
                    };
                })}
                displayEventTime
                eventContent={renderEventContent}
                dateClick={handleDateClick}
                selectable
                datesSet={updateTitle}
                height="auto"
                expandRows
                nowIndicator
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventClick={handleEventClick}
            />

            {popover && (
                <div className="popover bs-popover-top show position-absolute popover-form"
                    style={{ top: popover.y, left: popover.x, zIndex: 2000, minWidth: 320, maxWidth: 500, width: 'auto' }}
                >
                    <div className="popover-arrow"></div>
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
