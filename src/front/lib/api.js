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

//--------------------------------
export const loadInitialData = async (dispatch, token) => {
  const base = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");
  const headers = { 
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  };

  console.log("🔄 Cargando datos iniciales...");

  try {
    // Helper function para fetch con mejor error handling
    const fetchData = async (endpoint) => {
      console.log(`📡 Fetching: ${base}${endpoint}`);
      const response = await fetch(`${base}${endpoint}`, { headers });
      
      console.log(`📊 ${endpoint} - Status:`, response.status);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status} en ${endpoint}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error(`❌ ${endpoint} devolvió HTML:`, text.substring(0, 200));
        throw new Error(`${endpoint} no devolvió JSON válido`);
      }

      return await response.json();
    };

    // Calendars + Events
    try {
      console.log("📅 Cargando calendarios...");
      const calendars = await fetchData("/api/calendars");
      console.log("✅ Calendarios cargados:", calendars.length || 0);
      
      console.log("📅 Cargando eventos...");
      const events = await fetchData("/api/events");
      console.log("✅ Eventos cargados:", events.length || 0);
      
      dispatch({ type: "SET_CALENDARS", payload: { calendars, events } });
    } catch (calError) {
      console.warn("⚠️ Error cargando calendarios/eventos:", calError.message);
      // Continuar sin calendarios
      dispatch({ type: "SET_CALENDARS", payload: { calendars: [], events: [] } });
    }

    // TaskGroups + Tasks
    try {
      console.log("📝 Cargando grupos de tareas...");
      const groups = await fetchData("/api/taskgroups");
      console.log("✅ Grupos cargados:", groups.length || 0);
      
      console.log("📝 Cargando tareas...");
      const tasks = await fetchData("/api/tasks");
      console.log("✅ Tareas cargadas:", tasks.length || 0);
      
      dispatch({ type: "SET_TASKGROUPS", payload: { groups, tasks } });
    } catch (taskError) {
      console.warn("⚠️ Error cargando tareas:", taskError.message);
      // Continuar sin tareas
      dispatch({ type: "SET_TASKGROUPS", payload: { groups: [], tasks: [] } });
    }

    console.log("✅ Carga de datos iniciales completada");
    
  } catch (error) {
    console.error("💥 Error general cargando datos iniciales:", error);
    throw error; // Re-throw para que el login lo maneje
  }
};

