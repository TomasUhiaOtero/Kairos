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
    const [items, setItems] = useState([]);

    // Función para obtener colores desde el store
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

    // crear/editar items
    const handleAddItem = (item) => {
        if (!item.title?.trim()) {
            console.error("Título vacío");
            return;
        }

        // Fecha por defecto si no viene
        const today = new Date().toISOString().split('T')[0];
        const startDate = item.startDate || today;
        const endDate = item.endDate || startDate;

        let start, end, allDay;

        if (item.type === 'task') {
            // Si la tarea tiene hora, la usamos
            if (item.startTime) {
                start = new Date(`${startDate}T${item.startTime}`);
                end = new Date(start.getTime() + 30 * 60 * 1000); // duración 30 min
                allDay = false;
            } else {
                // Si no tiene hora, marcar como todo el día
                start = new Date(`${startDate}T00:00:00`);
                end = new Date(`${startDate}T23:59:59`);
                allDay = true;
            }
        } else { // evento
            if (item.allDay) {
                start = new Date(`${startDate}T00:00:00`);
                end = new Date(`${endDate}T23:59:59`);
                allDay = true;
            } else {
                start = new Date(`${startDate}T${item.startTime || '09:00'}`);
                end = new Date(`${endDate}T${item.endTime || '10:00'}`);
                allDay = false;
            }
        }

        const newItem = {
            ...item,
            id: item.id || Date.now() + Math.random(),
            start: start.toISOString(),
            end: end.toISOString(),
            allDay,
        };

        setItems(prev => {
            const exists = prev.find(i => i.id === newItem.id);
            if (exists) return prev.map(i => i.id === newItem.id ? newItem : i);
            return [...prev, newItem];
        });

        setPopover(null);
    };




    //  eliminar items
    const handleDeleteItem = (itemId) => {
        console.log("Eliminando item:", itemId);

        setItems(prev => {
            const newItems = prev.filter(item => item.id !== itemId);
            console.log("Items después de eliminar:", newItems.length);
            return newItems;
        });

        setPopover(null);
    };

    // Click en día vacío
    const handleDateClick = (arg) => {
        console.log("Click en fecha:", arg.dateStr);

        const rect = arg.dayEl.getBoundingClientRect();
        let popoverWidth = 300;
        let popoverHeight = 400;

        let x = rect.left + rect.width / 2 - popoverWidth / 2;
        let y = rect.top - popoverHeight - 10;
        if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
        if (x < 0) x = 10;
        if (y < 0) y = rect.bottom + 10;

        setPopover({
            x,
            y,
            item: {
                type: 'event',
                startDate: arg.dateStr,
                endDate: arg.dateStr,
                allDay: true,
                calendarId: store.calendar[0]?.id,
            },
        });
    };

    // Click en evento existente
    const handleEventClick = (clickInfo) => {
        console.log("Click en evento:", clickInfo.event.extendedProps);

        const item = clickInfo.event.extendedProps;
        const rect = clickInfo.jsEvent.target.getBoundingClientRect();
        let popoverWidth = 300;
        let popoverHeight = 400;

        let x = rect.left + rect.width / 2 - popoverWidth / 2;
        let y = rect.top - popoverHeight - 10;
        if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
        if (x < 0) x = 10;
        if (y < 0) y = rect.bottom + 10;

        // Convertir las fechas del evento a formato para inputs
        const eventStart = clickInfo.event.start;
        const eventEnd = clickInfo.event.end;

        const itemWithDates = {
            ...item,
            startDate: eventStart ? eventStart.toISOString().split('T')[0] : item.startDate,
            endDate: eventEnd ? eventEnd.toISOString().split('T')[0] : item.endDate,
            startTime: eventStart && !clickInfo.event.allDay ?
                eventStart.toTimeString().slice(0, 5) : item.startTime,
            endTime: eventEnd && !clickInfo.event.allDay ?
                eventEnd.toTimeString().slice(0, 5) : item.endTime,
        };

        setPopover({ x, y, item: itemWithDates });
    };

    // Toggle estado de tarea completada
    const toggleTaskDone = (taskId) => {
        console.log("Toggle task done:", taskId);
        setItems(prev => prev.map(i => i.id === taskId ? { ...i, done: !i.done } : i));
    };

    // Renderizar contenido del evento
    // Renderizar eventos
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
                ? eventInfo.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
            return (
                <div style={{ padding: '4px 6px' }}>
                    {startTimeDisplay && <span style={{ marginRight: '0.3em', fontWeight: 'bold' }}>{startTimeDisplay}</span>}
                    {eventInfo.event.title}
                </div>
            );
        }
    };




    // Cerrar popover al hacer click fuera
    useEffect(() => {
        const closePopover = (e) => {
            if (popover && !e.target.closest('.popover-form')) {
                setPopover(null);
            }
        };
        document.addEventListener('mousedown', closePopover);
        return () => document.removeEventListener('mousedown', closePopover);
    }, [popover]);

    // Funciones del toolbar
    const updateTitle = () => setTitle(calendarRef.current?.getApi().view.title || '');
    const goPrev = () => { calendarRef.current?.getApi().prev(); updateTitle(); };
    const goNext = () => { calendarRef.current?.getApi().next(); updateTitle(); };
    const goToday = () => { calendarRef.current?.getApi().today(); updateTitle(); };
    const handleViewChange = (e) => { calendarRef.current?.getApi().changeView(e.target.value); updateTitle(); };

    // Debug: mostrar items en consola
    useEffect(() => {
        console.log("Items actuales:", items.length, items);
    }, [items]);

    return (
        <div>
            {/* Debug info */}
            <div className="mb-2 text-sm text-muted">
                Items: {items.length} | Calendarios: {store.calendar.length} | Grupos: {store.taskGroup.length}
            </div>

            <div className="custom-toolbar flex justify-between mb-2">
                <div className="left-controls flex gap-1">
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
                editable
                eventDurationEditable
                events={items.map(item => {
                    const { start, end, type, calendarId, groupId, ...rest } = item;

                    const colors = type === 'event'
                        ? calendarsColors[calendarId] || { background: '#ccc', border: '#888', text: '#000' }
                        : taskGroupsColors[groupId] || { background: '#fff', border: '#000', text: '#000' };

                    return {
                        start,
                        end,
                        title: item.title,
                        allDay: item.allDay,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        textColor: colors.text,
                        extendedProps: rest,
                        display: 'block',
                        startEditable: true,
                        durationEditable: type === 'event',
                        editable: true,
                    };
                })}
                displayEventTime
                eventContent={renderEventContent}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                selectable
                datesSet={updateTitle}
                height="auto"
                expandRows
                nowIndicator
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                dayMaxEvents={3}
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
                            onDeleteItem={handleDeleteItem}
                            item={popover.item}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;