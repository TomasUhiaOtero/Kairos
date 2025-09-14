import React, { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
// Función para obtener YYYY-MM-DD sin modificar la fecha
// Convierte cualquier fecha (Date o string) a YYYY-MM-DD sin cambios de zona horaria
const formatDateLocal = (date) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date + "T00:00") : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const getLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const CreateEvent = ({ selectedDate, onAddItem, onDeleteItem, onClose, item }) => {
    const { store, dispatch } = useGlobalReducer();

    // Detectar si es edición
    const isEdit = !!item?.id;
    const isTask = item?.type === "task";

    console.log("CreateEvent - isEdit:", isEdit, "isTask:", isTask, "item:", item);

    // Tabs
    const [activeTab, setActiveTab] = useState(
        isEdit ? (isTask ? "tarea" : "evento") : "evento"
    );

    // Evento
    const [eventTitle, setEventTitle] = useState(isTask ? "" : item?.title || "");
    const [eventCalendar, setEventCalendar] = useState(
        !isTask ? item?.calendarId || (store.calendar[0]?.id ?? "") : ""
    );
    const [allDay, setAllDay] = useState(item?.allDay ?? true);
    const [repeat, setRepeat] = useState(item?.repeat || false);
    const [checkedDays, setCheckedDays] = useState(item?.checkedDays || Array(7).fill(false));
    const [startDate, setStartDate] = useState(item?.startDate || formatDateLocal(selectedDate) || formatDateLocal(new Date()));
    const [endDate, setEndDate] = useState(item?.endDate || formatDateLocal(selectedDate) || formatDateLocal(new Date()));

    const [startTime, setStartTime] = useState(item?.startTime || "");
    const [endTime, setEndTime] = useState(item?.endTime || "10:00");

    // Tarea
    const [taskTitle, setTaskTitle] = useState(isTask ? item?.title || "" : "");
    const [taskGroup, setTaskGroup] = useState(
        isTask ? item?.groupId || (store.taskGroup[0]?.id ?? "") : ""
    );
    const [taskRepeat, setTaskRepeat] = useState(item?.repeat || false);
    const [taskFrequencyNum, setTaskFrequencyNum] = useState(item?.frequencyNum || 1);
    const [taskFrequencyUnit, setTaskFrequencyUnit] = useState(item?.frequencyUnit || "día");



    const toggleDay = (index) => {
        const newDays = [...checkedDays];
        newDays[index] = !newDays[index];
        setCheckedDays(newDays);
    };

    const handleDelete = () => {
        if (!item?.id) return;
        if (onDeleteItem) onDeleteItem(item.id);
        if (onClose) onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (activeTab === "evento") {
            const newEvent = {
                id: item?.id, // mantener el ID si existe
                type: "event",
                title: eventTitle,
                allDay,
                repeat,
                checkedDays,
                startDate,
                endDate,
                startTime: allDay ? "" : startTime,
                endTime: allDay ? "" : endTime,
                calendarId: eventCalendar,
            };
            console.log("Enviando evento:", newEvent);
            onAddItem(newEvent);
        } else {
            const newTask = {
                id: item?.id, // mantener el ID si existe
                type: "task",
                title: taskTitle,
                groupId: taskGroup,
                repeat: taskRepeat,
                frequencyNum: taskFrequencyNum,
                frequencyUnit: taskFrequencyUnit,
                startDate,
                startTime,
                done: item?.done || false, // mantener el estado done si existe
            };
            console.log("Enviando tarea:", newTask);
            onAddItem(newTask);
        }

        if (onClose) onClose();
    };

    useEffect(() => {
        if (isEdit) {
            setActiveTab(isTask ? "tarea" : "evento");
        }
    }, [isEdit, isTask]);

    // Actualizar campos cuando cambie el item
    useEffect(() => {
        if (item) {
            if (item.type === "event") {
                setStartDate(item.startDate); // usar el string tal cual
                setEndDate(item.endDate);     // usar el string tal cual
            } else if (item.type === "task") {
                setStartDate(item.startDate); // usar el string tal cual
            }
        } else {
            const today = formatDateLocal(selectedDate || new Date());
            setStartDate(today);
            setEndDate(today);
        }
    }, [item, selectedDate]);


    const selectedEvent = store.calendar.find((e) => e.id === eventCalendar);
    const selectedGroup = store.taskGroup.find((g) => g.id === taskGroup);

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
                    <button className="btn btn-danger" onClick={handleDelete}>
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
                            {store.calendar.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                </option>
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
                        {!allDay && (
                            <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        )}
                    </div>

                    <div className="flex mb-2 items-center gap-2">
                        <label className="w-24">Fecha fin</label>
                        <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        {!allDay && (
                            <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        )}
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
                        <button type="submit" className="btn btn-primary btn-sm">
                            {isEdit ? "Actualizar" : "Guardar"}
                        </button>
                    </div>
                </form>
            )}

            {/* Formulario Tarea */}
            {activeTab === "tarea" && (
                <form onSubmit={handleSubmit}>
                    <div className="flex mb-2 items-center gap-2">
                        <label className="w-24">Título</label>
                        <input
                            className="form-control"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex mb-2 items-center gap-2">
                        <label className="w-24">Grupo</label>
                        <select
                            className="form-select w-auto"
                            value={taskGroup}
                            onChange={(e) => setTaskGroup(Number(e.target.value))}
                        >
                            {store.taskGroup.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.title}
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
                            <input
                                type="number"
                                className="form-control w-24"
                                min={1}
                                value={taskFrequencyNum}
                                onChange={(e) => setTaskFrequencyNum(e.target.value)}
                            />
                            <select
                                className="form-select w-auto"
                                value={taskFrequencyUnit}
                                onChange={(e) => setTaskFrequencyUnit(e.target.value)}
                            >
                                <option value="día">día/s</option>
                                <option value="semana">semana/s</option>
                                <option value="mes">mes/es</option>
                                <option value="año">año/s</option>
                            </select>
                        </div>
                    )}

                    <div className="flex mt-2 gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                            {isEdit ? "Actualizar" : "Guardar"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CreateEvent;