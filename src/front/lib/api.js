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

  const possibleKeys = ["token", "access_token", "accessToken", "jwt"];
  let token = null;
  for (const k of possibleKeys) {
    token = token || localStorage.getItem(k) || sessionStorage.getItem(k);
  }
  if (token && token.startsWith("Bearer ")) token = token.slice(7);

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${base}${path}`, { ...options, headers });
  return resp;
}

async function handleJSON(path, options = {}) {
  const res = await authFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  if (!res.ok) {
    // Incluye el detail si viene del backend
    const baseMsg = (data && (data.message || data.error)) || res.statusText || "Request failed";
    const detail = data && data.detail ? `: ${data.detail}` : "";
    const err = new Error(`${baseMsg}${detail}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// === Helpers para fallbacks de método ===
async function rawFetchJSON(path, { method = "GET", body, headers = {} } = {}) {
  const res = await authFetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { res, data };
}

function isMethodNotAllowed(res, data) {
  const msg = (data && (data.message || data.error || data.detail || "")) || "";
  return res.status === 405 || /405/i.test(msg);
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
// Utilidades de identidad
// ============================

function b64urlToB64(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";
  else if (pad !== 0) b64 += "===";
  return b64;
}

function safeAtob(str) {
  try {
    return atob(str);
  } catch {
    return atob(b64urlToB64(str));
  }
}

export function getUserId({ storeUser } = {}) {
  if (storeUser && (storeUser.id || storeUser.user_id)) {
    return storeUser.id ?? storeUser.user_id;
  }
  let token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return null;
  if (token.startsWith("Bearer ")) token = token.slice(7);

  const parts = token.split(".");
  if (parts.length < 1) return null;

  try {
    const payloadStr = atob(parts[0]); // primera parte = JSON (según tu backend)
    const payload = JSON.parse(payloadStr);
    return payload.user_id ?? payload.id ?? null;
  } catch (err) {
    console.error("Error decodificando token:", err);
    return null;
  }
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

export async function apiCreateTaskInGroup(userId, groupId, body) {
  return handleJSON(`/api/users/${userId}/groups/${groupId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// === Actualizar una tarea del usuario con fallbacks de método ===
// === Actualizar una tarea del usuario con fallbacks (PRIORIDAD: PUT) ===
export async function apiUpdateUserTask(userId, taskId, body) {
  const u = encodeURIComponent(String(userId));
  const t = encodeURIComponent(String(taskId));

  // 1) PUT primero (tu backend lo acepta)
  {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}`, {
      method: "PUT",
      body,
    });
    if (res.ok) return data;

    // si responde 500 con mensaje "405..." lo tratamos como método no permitido
    const looks405 = isMethodNotAllowed(res, data) ||
      (res.status === 500 && /405/i.test((data?.message || data?.error || data?.detail || "")));

    if (!looks405) {
      const baseMsg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      const detail = data && data.detail ? `: ${data.detail}` : "";
      const err = new Error(`${baseMsg}${detail}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
  }

  // 2) PATCH por si en otro despliegue está habilitado
  {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}`, {
      method: "PATCH",
      body,
    });
    if (res.ok) return data;

    const looks405 = isMethodNotAllowed(res, data) ||
      (res.status === 500 && /405/i.test((data?.message || data?.error || data?.detail || "")));

    if (!looks405) {
      const baseMsg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      const detail = data && data.detail ? `: ${data.detail}` : "";
      const err = new Error(`${baseMsg}${detail}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
  }

  // 3) POST con override -> PUT
  {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}?_method=PUT`, {
      method: "POST",
      body,
      headers: { "X-HTTP-Method-Override": "PUT" },
    });
    if (res.ok) return data;
  }

  // 4) /toggle si solo cambia el status
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "status")) {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}/toggle`, {
      method: "POST",
      body: { status: body.status },
    });
    if (res.ok) return data;
  }

  const err = new Error(
    "No se pudo actualizar la tarea: PUT/PATCH/override/toggle no disponibles."
  );
  err.status = 405;
  throw err;
}


// === Borrar tarea del usuario con fallback de method-override ===
export async function apiDeleteUserTask(userId, taskId) {
  const u = encodeURIComponent(String(userId));
  const t = encodeURIComponent(String(taskId));

  // DELETE directo
  {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}`, { method: "DELETE" });
    if (res.ok) return data;
    if (!isMethodNotAllowed(res, data)) {
      const baseMsg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      const detail = data && data.detail ? `: ${data.detail}` : "";
      const err = new Error(`${baseMsg}${detail}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
  }

  // POST con override para DELETE
  {
    const { res, data } = await rawFetchJSON(`/api/users/${u}/tasks/${t}?_method=DELETE`, {
      method: "POST",
      headers: { "X-HTTP-Method-Override": "DELETE" },
    });
    if (res.ok) return data;

    const baseMsg = (data && (data.message || data.error)) || res.statusText || "Request failed";
    const detail = data && data.detail ? `: ${data.detail}` : "";
    const err = new Error(`${baseMsg}${detail}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
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

export async function apiListUserTaskGroups(userId) {
  return handleJSON(`/api/users/${userId}/groups`);
}

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

// ============================
// Carga inicial
// ============================
export const loadInitialData = async (dispatch, token, storeUser = null) => {
  const base = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  // ⬇️ función para obtener userId (según tu token no-JWT)
  const getUserId = ({ storeUser } = {}) => {
    if (storeUser && (storeUser.id || storeUser.user_id)) {
      return storeUser.id ?? storeUser.user_id;
    }
    let t = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!t) return null;
    if (t.startsWith("Bearer ")) t = t.slice(7);
    const parts = t.split(".");
    if (parts.length < 1) return null;
    try {
      const payload = JSON.parse(atob(parts[0]));
      return payload.user_id ?? payload.id ?? null;
    } catch {
      return null;
    }
  };

  const userId = getUserId({ storeUser });

  const fetchJSON = async (endpoint) => {
    const res = await fetch(`${base}${endpoint}`, { headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Error ${res.status} en ${endpoint}: ${txt || res.statusText}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${endpoint} no devolvió JSON: ${txt?.slice(0, 200)}`);
    }
    return res.json();
  };

  try {
    // Calendarios + Eventos
    try {
      const calendars = await fetchJSON("/api/calendars");
      const events = await fetchJSON("/api/events");
      dispatch({ type: "SET_CALENDARS", payload: { calendars, events } });
    } catch (e) {
      console.warn("No se pudieron cargar calendarios/eventos:", e.message);
    }

    // Grupos + Tareas (usa TUS endpoints reales)
    try {
      if (!userId) {
        console.warn("No hay userId; omito carga de grupos/tareas.");
        dispatch({ type: "SET_TASKGROUPS", payload: { taskgroup: [], tasks: [] } });
      } else {
        const groups = await fetchJSON(`/api/users/${userId}/groups`);
        const tasksRaw = await fetchJSON(`/api/users/${userId}/tasks`);

        // Normaliza tareas al shape que usa tu UI
        const tasks = Array.isArray(tasksRaw)
          ? tasksRaw.map(t => ({
              id: t.id,
              type: "task",
              title: t.title,
              groupId: t.task_group_id,
              done: !!t.status,
              startDate: t.date ? String(t.date).slice(0, 10) : null,
            }))
          : [];

        // ⬅️ OJO: el reducer espera 'taskgroup' (no 'groups')
        dispatch({ type: "SET_TASKGROUPS", payload: { taskgroup: groups, tasks } });
      }
    } catch (e) {
      console.warn("No se pudieron cargar grupos/tareas:", e.message);
      dispatch({ type: "SET_TASKGROUPS", payload: { taskgroup: [], tasks: [] } });
    }
  } catch (e) {
    console.error("Error general en loadInitialData:", e);
    throw e;
  }
};
