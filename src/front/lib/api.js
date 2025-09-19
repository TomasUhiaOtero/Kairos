// src/front/lib/api.js

// ============================
// Helpers base
// ============================
export function getBackendBase() {
  const backend = import.meta.env.VITE_BACKEND_URL;
  if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");
  return backend.replace(/\/+$/, "");
}

export async function authFetch(path, options = {}) {
  const base = getBackendBase();
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Por defecto mandamos JSON si hay body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${base}${path}`, { ...options, headers });
  return resp;
}

// Helper para parsear JSON y lanzar error si no es ok
async function handleJSON(path, options = {}) {
  const res = await authFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // puede ser vacío
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Construir query strings fácilmente
function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  return qs.toString() ? `?${qs.toString()}` : "";
}

// ============================
// EVENTS
// ============================

export async function apiListEvents({ start, end } = {}) {
  return handleJSON(`/api/events${buildQuery({ start, end })}`);
}

export async function apiCreateEvent(body) {
  return handleJSON(`/api/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateEvent(id, body) {
  return handleJSON(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteEvent(id) {
  return handleJSON(`/api/events/${id}`, { method: "DELETE" });
}

// ============================
// TASKS
// ============================

export async function apiListTasks({ start, end } = {}) {
  return handleJSON(`/api/tasks${buildQuery({ start, end })}`);
}

export async function apiCreateTask(body) {
  return handleJSON(`/api/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateTask(id, body) {
  return handleJSON(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteTask(id) {
  return handleJSON(`/api/tasks/${id}`, { method: "DELETE" });
}

// ============================
// CALENDARS
// ============================

export async function apiListCalendars() {
  return handleJSON(`/api/calendars`);
}

export async function apiCreateCalendar(body) {
  return handleJSON(`/api/calendars`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateCalendar(body) {
  return handleJSON(`/api/calendars/${body.editingId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteCalendar(id) {
  return handleJSON(`/api/calendars/${id}`, { method: "DELETE" });
}

// ============================
// TASK GROUPS
// ============================

export async function apiListTaskGroups() {
  return handleJSON(`/api/task-groups`);
}

export async function apiCreateTaskGroup(body) {
  return handleJSON(`/api/task-groups`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateTaskGroup(body) {
  return handleJSON(`/api/task-groups/${body.id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteTaskGroup(id) {
  return handleJSON(`/api/task-groups/${id}`, { method: "DELETE" });
}

export const loadInitialData = async (dispatch, token) => {
  const base = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  console.log("Cargando datos iniciales...");
  try {
    // Helper function para fetch con mejor error handling
    const fetchData = async (endpoint) => {
      console.log(` Fetching: ${base}${endpoint}`);
      const response = await fetch(`${base}${endpoint}`, { headers });
      console.log(` ${endpoint} - Status:`, response.status);
      if (!response.ok) {
        throw new Error(
          `Error ${response.status} en ${endpoint}: ${response.statusText}`
        );
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error(`:x: ${endpoint} devolvió HTML:`, text.substring(0, 200));
        throw new Error(`${endpoint} no devolvió JSON válido`);
      }
      return await response.json();
    };
    // Calendars + Events
    try {
      console.log("Cargando calendarios...");
      const calendars = await fetchData("/api/calendars");
      console.log("Calendarios cargados:", calendars.length || 0);
      console.log("Cargando eventos...");
      const events = await fetchData("/api/events");
      console.log("Eventos cargados:", events.length || 0);
      dispatch({ type: "SET_CALENDARS", payload: { calendars, events } });
    } catch (calError) {
      console.warn(
        ":advertencia: Error cargando calendarios/eventos:",
        calError.message
      );
      // Continuar sin calendarios
    }
    // TaskGroups + Tasks
    try {
      console.log(":nota: Cargando grupos de tareas...");
      const groups = await fetchData("/api/taskgroups");
      console.log("Grupos cargados:", groups.length || 0);
      console.log("Cargando tareas...");
      const tasks = await fetchData("/api/tasks");
      console.log("Tareas cargadas:", tasks.length || 0);
      dispatch({ type: "SET_TASKGROUPS", payload: { groups, tasks } });
    } catch (taskError) {
      console.warn(":advertencia: Error cargando tareas:", taskError.message);
      // Continuar sin tareas
      dispatch({ type: "SET_TASKGROUPS", payload: { groups: [], tasks: [] } });
    }
    console.log("Carga de datos iniciales completada");
  } catch (error) {
    console.error("Error general cargando datos iniciales:", error);
    throw error; // Re-throw para que el login lo maneje
  }
};
