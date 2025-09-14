import React, { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

const CreateEvent = ({ selectedDate, onAddItem, item }) => {
    const { store, dispatch } = useGlobalReducer();

    // Detectar si es edición
    const isEdit = !!item?.id;
    const isTask = item?.type === 'task';

    // Tabs
    const [activeTab, setActiveTab] = useState(
        isEdit ? (isTask ? "tarea" : "evento") : "evento"
    );

    // Estado Evento
    const [eventTitle, setEventTitle] = useState(item?.title || "");
    const [eventCalendar, setEventCalendar] = useState(item?.calendarId || (store.calendar[0]?.id ?? ""));
    const [allDay, setAllDay] = useState(item?.allDay ?? true);
    const [repeat, setRepeat] = useState(item?.repeat || false);
    const [checkedDays, setCheckedDays] = useState(item?.checkedDays || Array(7).fill(false));
    const [startDate, setStartDate] = useState(item?.startDate || selectedDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(item?.endDate || selectedDate || new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(item?.startTime || ""); const [endTime, setEndTime] = useState(item?.endTime || "10:00");


    // Estado Tarea
    const [taskTitle, setTaskTitle] = useState(item?.title || "");
    const [taskGroup, setTaskGroup] = useState(item?.groupId || (store.taskGroup[0]?.id ?? ""));
    const [taskRepeat, setTaskRepeat] = useState(item?.repeat || false);
    const [taskFrequencyNum, setTaskFrequencyNum] = useState(item?.frequencyNum || 1);
    const [taskFrequencyUnit, setTaskFrequencyUnit] = useState(item?.frequencyUnit || "día");

    const toggleDay = (index) => {
        const newDays = [...checkedDays];
        newDays[index] = !newDays[index];
        setCheckedDays(newDays);
    };
    const handleDelete = () => {
        if (!item) return;
        if (onDeleteItem) onDeleteItem();
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeTab === "evento") {
            onAddItem({
                type: "event",
                title: eventTitle,
                allDay,
                repeat,
                checkedDays,
                startDate,
                endDate,
                startTime,
                endTime,
                calendarId: eventCalendar
            });
        } else {
            onAddItem({
                id: item?.id,
                type: "task",
                title: taskTitle,
                groupId: taskGroup,
                repeat: taskRepeat,
                frequencyNum: taskFrequencyNum,
                frequencyUnit: taskFrequencyUnit,
                startDate,
                startTime: startTime || null, // <-- agregamos startTime aquí
           
        });
    }
};
useEffect(() => {
    if (!isEdit) {
        setStartDate(selectedDate);
        setEndDate(selectedDate);
    }
}, [selectedDate, isEdit]);

// Obtener los datos seleccionados del store
const selectedEvent = store.calendar.find(e => e.id === eventCalendar);
const selectedGroup = store.taskGroup.find(g => g.id === taskGroup);


return (
    <div className="d-flex flex-column gap-2">
        {/* Tabs */}
        {!isEdit && (
            <ul className="nav nav-pills mb-2 justify-center">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "evento" ? "active" : ""}`}
                        onClick={() => setActiveTab("evento")}
                    >
                        Evento
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "tarea" ? "active" : ""}`}
                        onClick={() => setActiveTab("tarea")}
                    >
                        Tarea
                    </button>
                </li>
            </ul>
        )}

        {isEdit && (
            <div className="mb-2 text-center">
                <button
                    className="btn btn-danger"
                    onClick={handleDelete} // define aquí tu función de eliminar
                >
                    Eliminar
                </button>
            </div>
        )}

        {/* Formulario Evento */}
        {activeTab === "evento" && (
            <form onSubmit={handleSubmit}>
                <div className="flex mb-2">
                    <label className="me-2 w-24">Título</label>
                    <input
                        className="form-control"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="me-2 w-24">Calendario</label>
                    <select
                        className="form-select"
                        value={eventCalendar}
                        onChange={(e) => setEventCalendar(Number(e.target.value))}
                    >
                        {store.calendar.map(event => (
                            <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                    </select>

                    <div
                        className="w-6 h-6 rounded-circle border"
                        style={{
                            backgroundColor: selectedEvent?.color || "#ccc",
                            borderColor: selectedEvent?.color || "#888",
                        }}
                    />
                </div>

                {/* Resto de inputs para fechas, horas y repetición */}
                <div className="flex mb-2 items-center gap-2">
                    <label className="me-2">Todo el día</label>
                    <div className="form-check form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={allDay}
                            onChange={() => setAllDay(!allDay)}
                        />
                    </div>
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Fecha inicio</label>
                    <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    {!allDay && <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Fecha fin</label>
                    <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    {!allDay && <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Repetir</label>
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={repeat} onChange={() => setRepeat(!repeat)} />
                    </div>
                </div>

                {repeat && (
                    <div className="flex gap-2 mt-2">
                        {["L", "M", "X", "J", "V", "S", "D"].map((initial, i) => (
                            <div
                                key={i}
                                onClick={() => toggleDay(i)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-sm font-bold
                    ${checkedDays[i] ? "bg-gray-500 text-white" : "bg-white border border-gray-400 text-gray-800"}`}
                            >
                                {initial}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex mt-2 gap-2">
                    <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                </div>
            </form>
        )}

        {/* Formulario Tarea */}
        {activeTab === "tarea" && (
            <form onSubmit={handleSubmit}>
                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Título</label>
                    <input className="form-control" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Grupo</label>
                    <select
                        className="form-select w-auto"
                        value={taskGroup}
                        onChange={(e) => setTaskGroup(Number(e.target.value))}
                    >
                        {store.taskGroup.map(group => (
                            <option key={group.id} value={group.id}>
                                {group.title} {/* aquí antes tenías group.name */}
                            </option>
                        ))}
                    </select>
                    <div
                        className="w-6 h-6 rounded-circle border"
                        style={{
                            backgroundColor: selectedGroup?.color || "#ccc",
                            borderColor: selectedGroup?.color || "#888",
                        }}
                    />
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Fecha</label>
                    <input type="date" className="form-control w-auto flex-shrink-0" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <input
                        type="time"
                        className="form-control"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="Opcional"
                    />
                </div>

                <div className="flex mb-2 items-center gap-2">
                    <label className="w-24">Repetir</label>
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={taskRepeat} onChange={() => setTaskRepeat(!taskRepeat)} />
                    </div>
                </div>

                {taskRepeat && (
                    <div className="flex mb-2 items-center gap-2">
                        <label className="w-24">Cada</label>
                        <input type="number" className="form-control w-24" min={1} value={taskFrequencyNum} onChange={(e) => setTaskFrequencyNum(e.target.value)} />
                        <select className="form-select w-auto" value={taskFrequencyUnit} onChange={(e) => setTaskFrequencyUnit(e.target.value)}>
                            <option value="día">día/s</option>
                            <option value="semana">semana/s</option>
                            <option value="mes">mes/es</option>
                            <option value="año">año/s</option>
                        </select>
                    </div>
                )}

                <div className="flex mt-2 gap-2">
                    <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                </div>
            </form>
        )}
    </div>
);
};

export default CreateEvent;
