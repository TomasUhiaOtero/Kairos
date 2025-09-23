import React, { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { apiCreateTaskInGroup, getUserId } from "../lib/api.js";

// Función para obtener YYYY-MM-DD sin modificar la fecha
const formatDateLocal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatISODate = (date, time) => {
  if (!date) return "";
  return time ? `${date}T${time}` : date;
};

const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CreateEvent = ({ selectedDate, onAddItem, onDeleteItem, onClose, item }) => {
  const { store } = useGlobalReducer();
  const [durationDays, setDurationDays] = useState(0);
  const [endDateManuallyChanged, setEndDateManuallyChanged] = useState(false);

  const isEdit = !!item?.id;
  const isTask = item?.type === "task";
  const isNewItem = !item?.id;

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
  const [startDate, setStartDate] = useState(formatDateLocal(selectedDate) || formatDateLocal(new Date()));
  const [endDate, setEndDate] = useState(formatDateLocal(selectedDate) || formatDateLocal(new Date()));
  const [startTime, setStartTime] = useState(() => {
    if (item?.id) {
      if (item?.type === "task") return item?.startTime || "";
      if (item?.type === "event") return item?.startTime || "09:00";
    }
    if (item?.type === "task") return "";
    if (item?.type === "event") return "09:00";
    return "";
  });

  const [endTime, setEndTime] = useState(() => {
    if (item?.id && item?.type === "event") return item?.endTime || "09:15";
    if (item?.type === "event" && !item?.id) return "09:15";
    return "";
  });

  // Tarea
  const [taskTitle, setTaskTitle] = useState(isTask ? item?.title || "" : "");
  const [taskGroup, setTaskGroup] = useState(
    isTask ? item?.groupId || (store.taskGroup[0]?.id ?? "") : (store.taskGroup[0]?.id ?? "")
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
    if (onDeleteItem) onDeleteItem(item.id, item.type, item.groupId);
    if (onClose) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeTab === "evento") {
      const newEvent = {
        ...item,
        type: "event",
        title: eventTitle,
        allDay,
        repeat,
        checkedDays,
        startDate: formatISODate(startDate, allDay ? "" : startTime),
        endDate: formatISODate(endDate, allDay ? "" : endTime),
        startTime: allDay ? "" : startTime,
        endTime: allDay ? "" : endTime,
        calendarId: eventCalendar,
      };
      onAddItem(newEvent);
      if (onClose) onClose();
      return;
    }

    // ---- TAREA ----
    // ✅ EDITAR TAREA (NO crear de nuevo)
    if (isEdit && isTask) {
      onAddItem({
        ...item,
        type: "task",
        title: taskTitle.trim(),
        groupId: Number(taskGroup),
        startDate,                   // "YYYY-MM-DD"
        startTime: startTime || "",  // opcional
        mode: "edit",
        originalId: item.id,         // <- clave para que Calendar use el id real
      });
      if (onClose) onClose();
      return;
    }

    // ➕ CREAR TAREA (flujo actual)
    (async () => {
      const userId = getUserId({ storeUser: store.user });
      if (!userId) { alert("No se pudo identificar al usuario."); return; }
      if (!taskTitle?.trim()) return;
      if (!taskGroup) { alert("Selecciona un grupo de tareas."); return; }

      const groupIdNum = Number(taskGroup);
      const group = store.taskGroup.find(g => Number(g.id) === groupIdNum);
      const safeColor = (group?.color && String(group.color).trim()) || "#000000";

      // Fecha a medianoche para "solo día"
      const dateISO = startDate ? `${startDate}T00:00:00` : null;

      const payload = {
        title: taskTitle.trim(),
        status: false,
        date: dateISO,
        color: safeColor, // nunca null
      };

      try {
        const created = await apiCreateTaskInGroup(userId, groupIdNum, payload);
        const normalized = {
          id: String(created.id), // fuerza string
          type: "task",
          title: created.title,
          groupId: created.task_group_id ?? groupIdNum,
          done: !!created.status,
          startDate: created.date ? String(created.date).slice(0, 10) : null,
        };
        onAddItem(normalized);
      } catch (err) {
        console.error("Error creando tarea:", err);
        alert(err?.message || "Error creando la tarea");
        return;
      }
    })();

    if (onClose) onClose();
  };

  // --------------------------------
  // USE EFFECT
  useEffect(() => {
    if (isEdit) {
      setActiveTab(isTask ? "tarea" : "evento");
    }
  }, [isEdit, isTask]);

  useEffect(() => {
    if (isNewItem) {
      if (activeTab === "tarea") {
        setStartTime("");
        setEndTime("");
      } else if (activeTab === "evento") {
        setStartTime("09:00");
        setEndTime("09:15");
      }
    }
  }, [activeTab, isNewItem]);

  useEffect(() => {
    if (item?.id) {
      if (item.type === "event") {
        setStartDate(formatDateLocal(item.startDate));
        setEndDate(formatDateLocal(item.endDate));
        setStartTime(item.startTime || "09:00");
        setEndTime(item.endTime || "09:15");
        const diffDays = Math.round((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
        setDurationDays(diffDays);
      } else if (item.type === "task") {
        setStartDate(formatDateLocal(item.startDate));
        setStartTime(item.startTime || "");
        setEndTime("");
      }
    } else {
      const today = formatDateLocal(selectedDate || new Date());
      setStartDate(today);
      setEndDate(today);
      setDurationDays(0);
    }
  }, [item, selectedDate]);

  const handleStartDateChange = (value) => {
    if (!value) return;
    const newStart = new Date(value);
    setStartDate(value);

    if (!endDateManuallyChanged) {
      const newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + durationDays);
      setEndDate(getLocalDateString(newEnd));
    }
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    setEndDateManuallyChanged(true);
  };

  const selectedEvent = store.calendar.find((e) => e.id === eventCalendar);
  const selectedGroup = store.taskGroup.find((g) => g.id === taskGroup);

  return (
    <div className="d-flex flex-column gap-2">
      {!isEdit && (
        <ul className="flex justify-center gap-2 mb-2">
          <li>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${activeTab === "evento"
                  ? "bg-emerald-700 text-white"
                  : "text-gray-700 hover:text-avocado-600 hover:bg-neutral-100"
                }`}
              onClick={() => setActiveTab("evento")}
            >
              Evento
            </button>
          </li>
          <li>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${activeTab === "tarea"
                  ? "bg-emerald-700 text-white"
                  : "text-gray-700 hover:text-avocado-600 hover:bg-neutral-100"
                }`}
              onClick={() => setActiveTab("tarea")}
            >
              Tarea
            </button>
          </li>
        </ul>
      )}

      {/* Formulario Evento */}
      {activeTab === "evento" && (
        <form onSubmit={handleSubmit}>
          <div className="flex mb-2">
            <label className="me-2 w-24">Título</label>
            <input className="form-control" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
          </div>

          <div className="flex mb-2 items-center gap-2">
            <label className="me-2 w-24">Calendario</label>
            {store.calendar.length > 0 ? (
              <select className="form-select" value={eventCalendar} onChange={(e) => setEventCalendar(e.target.value)} required>
                {store.calendar.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500">Crea un calendario primero</p>
            )}
            <div
              className="w-6 h-6 rounded-full border flex-shrink-0"
              style={{ backgroundColor: selectedEvent?.color || "#ccc", borderColor: selectedEvent?.color || "#888" }}
            />
          </div>

          <div className="flex mb-2 items-center gap-2">
            <label className="me-2">Todo el día</label>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" checked={allDay} onChange={() => setAllDay(!allDay)} />
            </div>
          </div>

          <div className="flex mb-2 items-center gap-2">
            <label className="w-24">Fecha inicio</label>
            <input type="date" className="form-control" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            {!allDay && <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
          </div>

          <div className="flex mb-2 items-center gap-2">
            <label className="w-24">Fecha fin</label>
            <input type="date" className="form-control" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} />
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
                <div key={i} onClick={() => toggleDay(i)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-sm font-bold
                  ${checkedDays[i] ? "bg-gray-500 text-white" : "bg-white border border-gray-400 text-gray-800"}`}>
                  {initial}
                </div>
              ))}
            </div>
          )}

          <div className="flex mt-2 gap-2">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={store.calendar.length === 0 || !eventCalendar}
            >
              {isEdit ? "Actualizar" : "Guardar"}
            </button>
            {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>}
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
            {store.taskGroup.length > 0 ? (
              <select className="form-select w-auto" value={taskGroup} onChange={(e) => setTaskGroup(e.target.value)} required>
                {store.taskGroup.map((group) => (
                  <option key={group.id} value={group.id}>{group.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500" required>Crea un grupo de tareas primero</p>
            )}
            <div
              className="w-6 h-6 rounded-circle border"
              style={{ backgroundColor: (store.taskGroup.find(g => g.id === taskGroup)?.color) || "#ccc",
                       borderColor: (store.taskGroup.find(g => g.id === taskGroup)?.color) || "#888" }}
            />
          </div>

          <div className="flex mb-2 items-center gap-2">
            <label className="w-24">Fecha</label>
            <input type="date" className="form-control w-auto flex-shrink-0" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="Opcional" />
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
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={store.taskGroup.length === 0 || !taskGroup}
            >
              {isEdit ? "Actualizar" : "Guardar"}
            </button>
            {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>}
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateEvent;
