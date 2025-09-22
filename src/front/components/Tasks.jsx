import { useState, useMemo } from "react";
import TasksSection from "./TasksSection";
import TaskItem from "./TaskItem";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { apiUpdateUserTask, apiDeleteUserTask, getUserId } from "../lib/api.js";


export default function Tasks({ tasks }) {
    const { store, dispatch } = useGlobalReducer();
    const taskGroups = store.taskGroup || [];

    // Estado para los filtros
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        atrasado: true,
        conFecha: true,
        sinFecha: true
    });

    // Función para formatear fecha
    const formatDate = (date) => {
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const meses = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];

        const dia = dias[date.getDay()];
        const numeroDate = date.getDate();
        const mes = meses[date.getMonth()];

        return `${dia}, ${numeroDate} de ${mes}`;
    };

    // Categorizar tareas
    const categorizedTasks = useMemo(() => {
        const now = new Date();
        const result = {
            atrasado: [],
            conFecha: {},
            sinFecha: [],
        };

        (tasks || []).forEach((task) => {
            if (task.date) {
                const taskDate = new Date(task.date);

                if (taskDate < now === false) {
                    result.atrasado.push(task);
                } else {
                    const formattedDate = formatDate(taskDate);
                    if (!result.conFecha[formattedDate]) {
                        result.conFecha[formattedDate] = [];
                    }
                    result.conFecha[formattedDate].push(task);
                }
            } else {
                result.sinFecha.push(task);
            }
        });

        return result;
    }, [tasks]);

    // Acciones conectadas al store
    const updateTask = async (taskId, updateData) => {
      const prev = store.tasks.find(t => String(t.id) === String(taskId));
      if (!prev) return;

      const userId = getUserId({ storeUser: store.user });
      if (!userId) {
        alert("No se pudo identificar al usuario.");
        return;
      }

      // Mapeo front -> backend (done -> status)
      const body = {};
      if (updateData.title !== undefined) body.title = updateData.title;
      if (updateData.done !== undefined) body.status = !!updateData.done;

      // Optimistic update
      dispatch({
        type: "UPDATE_TASK",
        payload: { ...prev, ...updateData }
      });

      try {
        await apiUpdateUserTask(userId, Number(taskId), body);
      } catch (e) {
        // Rollback si falla
        dispatch({
          type: "UPDATE_TASK",
          payload: prev
        });
        console.error("No se pudo guardar el cambio de tarea:", e);
        alert(e?.message || "No se pudo guardar la tarea");
      }
    };

    const deleteTask = async (taskId) => {
        const userId = getUserId({ storeUser: store.user });
        if (!userId) {
            alert("No se pudo identificar al usuario.");
            return;
        }
    
        const taskToDelete = store.tasks.find(t => String(t.id) === String(taskId));
        if (!taskToDelete) return;
    
        // Optimistic
        dispatch({ type: "DELETE_TASK", payload: taskId });
    
        try {
            await apiDeleteUserTask(Number(userId), Number(taskId));
        } catch (e) {
            // Rollback
            dispatch({ type: "ADD_TASK", payload: taskToDelete });
            console.error("Error borrando tarea:", e);
            alert(e?.message || "No se pudo borrar la tarea");
        }
    };




    // Filtros
    const toggleFilter = (filterType) => {
        setActiveFilters((prev) => ({
            ...prev,
            [filterType]: !prev[filterType],
        }));
    };

    const clearAllFilters = () => {
        setActiveFilters({
            atrasado: false,
            conFecha: false,
            sinFecha: false,
        });
    };

    const selectAllFilters = () => {
        setActiveFilters({
            atrasado: true,
            conFecha: true,
            sinFecha: true,
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center p-4 border-gray-400">
            {/* Encabezado */}
            <div className="relative w-full max-w-lg mb-4 flex items-center">
                <h1 className="text-2xl font-bold mx-auto">Tareas</h1>
                <button
                    onClick={() => setShowFilterPopup(true)}
                    className="absolute right-0 top-3 text-sky-600 text-sm hover:text-sky-800 transition-colors"
                >
                    Filtrar
                </button>
            </div>

            {/* Contenedor general */}
            <div className="w-full max-w-2xl border-gray-300 shadow-md rounded-2xl bg-white p-10 space-y-20">
                {/* Sección Atrasado */}
                {activeFilters.atrasado && (
                    <TasksSection title="Atrasado">
                        {categorizedTasks.atrasado.map((task) => (
                            <TaskItem
                                key={task.id}
                                {...task}
                                color={taskGroups.find(g => g.id === task.groupId)?.color || '#000000'}
                                onUpdate={updateTask}
                                onDelete={deleteTask}
                            />
                        ))}
                    </TasksSection>
                )}

                {/* Sección con fecha */}
                {activeFilters.conFecha &&
                    Object.entries(categorizedTasks.conFecha).map(([date, taskList]) => (
                        <TasksSection key={date} title={date}>
                            {taskList.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    {...task}
                                    color={taskGroups.find(g => g.id === task.groupId)?.color || '#000000'}
                                    onUpdate={updateTask}
                                    onDelete={deleteTask}
                                />
                            ))}
                        </TasksSection>
                    ))}

                {/* Sección Sin fecha */}
                {activeFilters.sinFecha && (
                    <TasksSection title="Sin fecha">
                        {categorizedTasks.sinFecha.length > 0 ? (
                            categorizedTasks.sinFecha.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    {...task}
                                    color={taskGroups.find(g => g.id === task.groupId)?.color || '#000000'}
                                    onUpdate={updateTask}
                                    onDelete={deleteTask}
                                />
                            ))
                        ) : (
                            <div className="text-gray-400 text-sm p-4">No hay tareas</div>
                        )}
                    </TasksSection>
                )}

                {/* Mensaje cuando no hay filtros activos */}
                {!activeFilters.atrasado &&
                    !activeFilters.conFecha &&
                    !activeFilters.sinFecha && (
                        <div className="text-center text-gray-400 py-8">
                            <p className="text-lg">No hay filtros seleccionados</p>
                            <p className="text-sm">Usa el botón "Filtrar" para mostrar tareas</p>
                        </div>
                    )}
            </div>

            {/* Popup de Filtros */}
            {showFilterPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Filtrar Tareas
                            </h3>
                            <button
                                onClick={() => setShowFilterPopup(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Opción Atrasado */}
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={activeFilters.atrasado}
                                    onChange={() => toggleFilter("atrasado")}
                                    className="circular-checkbox text-gray-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">Tareas Atrasadas</span>
                                <span className="ml-auto text-sm text-gray-500">
                                    ({categorizedTasks.atrasado.length})
                                </span>
                            </label>

                            {/* Opción Con Fecha */}
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={activeFilters.conFecha}
                                    onChange={() => toggleFilter("conFecha")}
                                    className="circular-checkbox text-gray-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-700">Tareas con Fecha</span>
                                <span className="ml-auto text-sm text-gray-500">
                                    {Object.values(categorizedTasks.conFecha).flat().length}
                                </span>
                            </label>

                            {/* Opción Sin Fecha */}
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={activeFilters.sinFecha}
                                    onChange={() => toggleFilter("sinFecha")}
                                    className="circular-checkbox text-gray-600 focus:ring-green-500"
                                />
                                <span className="text-gray-700">Tareas sin Fecha</span>
                                <span className="ml-auto text-sm text-gray-500">
                                    {categorizedTasks.sinFecha.length}
                                </span>
                            </label>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={clearAllFilters}
                                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Limpiar Todo
                            </button>
                            <button
                                onClick={selectAllFilters}
                                className="flex-1 px-4 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
                            >
                                Seleccionar Todo
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFilterPopup(false)}
                            className="w-full mt-3 px-4 py-2 text-sky-600 font-medium hover:bg-sky-50 rounded-lg transition-colors"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            )}

            {/* Estilos CSS personalizados */}
            <style>{`
                .circular-checkbox {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid;
                    background-color: white;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s ease;
                }
                
                .circular-checkbox:checked {
                    background-color: currentColor;
                }
                
                .circular-checkbox:hover {
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
}