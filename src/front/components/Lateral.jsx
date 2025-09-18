import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import React, { useState } from "react";

export const Lateral = ({ onClose }) => {
    const { store, dispatch } = useGlobalReducer()
    const [createCalendar, setCreateCalendar] = useState(false);
    const [createTask, setCreateTask] = useState(false);

    const [title, setTitle] = useState("");
    const [color, setColor] = useState("#5A8770");
    const [editingId, setEditingId] = useState(null); // ID del item que se edita
    const [editingType, setEditingType] = useState(""); // 'calendar' o 'task'

    const resetForm = () => {
        setTitle("");
        setColor("#5A8770");
        setEditingId(null);
        setEditingType("");
        setCreateCalendar(false);
        setCreateTask(false);
    };

    const handleColorChange = (e) => setColor(e.target.value);
    const handleInputChange = (e) => {
        const value = e.target.value;
        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) setColor(value);
    };
    const handleTitleChange = (e) => setTitle(e.target.value);

    // Generar ID único
    const generateId = () => String(Date.now() + Math.random());

    // Guardar calendario (crear o editar)
    const handleSubmitCalendar = (e) => {
        e.preventDefault();
        if (!title) return;

        if (editingId !== null && editingType === "calendar") {
            // Editar calendario existente
            dispatch({
                type: "UPDATE_CALENDAR",
                payload: { id: editingId, title, color },
            });
        } else {
            // Crear nuevo calendario
            dispatch({
                type: "ADD_CALENDAR",
                payload: { id: generateId(), title, color },
            });
        }

        resetForm();
    };

    // Guardar grupo de tareas (crear o editar)
    const handleSubmitTask = (e) => {
        e.preventDefault();
        if (!title) return;

        if (editingId !== null && editingType === "task") {
            // Editar grupo de tareas existente
            dispatch({
                type: "UPDATE_TASKGROUP",
                payload: { id: editingId, title, color },
            });
        } else {
            // Crear nuevo grupo de tareas
            dispatch({
                type: "ADD_TASKGROUP",
                payload: { id: generateId(), title, color },
            });
        }

        resetForm();
    };

    // Editar item
    const handleEdit = (item, type) => {
        setTitle(item.title);
        setColor(item.color);
        setEditingId(item.id); 
        setEditingType(type);
        if (type === "calendar") setCreateCalendar(true);
        else setCreateTask(true);
    };

    // Borrar item
    const handleDelete = (item, type) => {
        if (type === "calendar") {
            dispatch({ type: "DELETE_CALENDAR", payload: { id: item.id } });
        } else {
            dispatch({ type: "DELETE_TASKGROUP", payload: { id: item.id } });
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-gray-50 shadow-xl border-l border-gray-200 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <span className="font-medium text-gray-900">Usuario</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Calendarios */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Calendarios</h3>
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => setCreateCalendar(true)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {store.calendar.length === 0 && <p className="text-sm text-gray-500">No hay calendarios aún</p>}
                        {store.calendar.map((cal) => (
                            <div key={cal.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }}></div>
                                    <span className="text-sm text-gray-700">{cal.title}</span>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => handleEdit(cal, "calendar")} className="text-blue-500 text-xs">Editar</button>
                                    <button onClick={() => handleDelete(cal, "calendar")} className="text-red-500 text-xs">Borrar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grupos de Tareas */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Grupos de Tareas</h3>
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => setCreateTask(true)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {store.taskGroup.length === 0 && <p className="text-sm text-gray-500">No hay grupos de tareas aún</p>}
                        {store.taskGroup.map((group) => (
                            <div key={group.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }}></div>
                                    <span className="text-sm text-gray-700">{group.title}</span>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => handleEdit(group, "task")} className="text-blue-500 text-xs">Editar</button>
                                    <button onClick={() => handleDelete(group, "task")} className="text-red-500 text-xs">Borrar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Formulario Crear/Editar Calendario */}
            {createCalendar && (
                <div className="card p-4 border rounded bg-white absolute top-20 left-4 w-72 shadow-lg">
                    <h3 className="font-semibold mb-2">{editingType === "calendar" ? "Editar calendario" : "Crear calendario"}</h3>
                    <form onSubmit={handleSubmitCalendar} className="space-y-3">
                        <div className="flex flex-col">
                            <label>Título:</label>
                            <input
                                type="text"
                                className="border rounded px-2 py-1"
                                value={title}
                                onChange={handleTitleChange}
                                required
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label>Color:</label>
                            <input type="color" value={color} onChange={handleColorChange} />
                            <input
                                type="text"
                                value={color}
                                onChange={handleInputChange}
                                className="border rounded px-2 py-1 w-20"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={resetForm} className="btn btn-secondary">Cerrar</button>
                            <button type="submit" className="btn btn-success">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Formulario Crear/Editar Grupo de Tareas */}
            {createTask && (
                <div className="card p-4 border rounded bg-white absolute top-20 left-4 w-72 shadow-lg">
                    <h3 className="font-semibold mb-2">{editingType === "task" ? "Editar grupo de tareas" : "Crear grupo de tareas"}</h3>
                    <form onSubmit={handleSubmitTask} className="space-y-3">
                        <div className="flex flex-col">
                            <label>Título:</label>
                            <input
                                type="text"
                                className="border rounded px-2 py-1"
                                value={title}
                                onChange={handleTitleChange}
                                required
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label>Color:</label>
                            <input className="rounded-circle" type="color" value={color} onChange={handleColorChange} />
                            <input
                            
                                type="text"
                                value={color}
                                onChange={handleInputChange}
                                className="border rounded px-2 py-1 w-20"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={resetForm} className="btn btn-secondary">Cerrar</button>
                            <button type="submit" className="btn btn-success">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Lateral;