import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { authFetch, loadInitialData } from "../lib/api";

export const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: null, ok: null });
  const navigate = useNavigate();
  const { dispatch } = useGlobalReducer();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, ok: null });

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");
      const base = backend.replace(/\/+$/, "");

      const url = `${base}/api/login`;
      console.log("🚀 Intentando login en:", url);
      console.log("📦 Datos enviados:", { email: form.email, password: "***" });

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(form),
      });

      console.log("📡 Status response:", resp.status);
      console.log("📋 Headers response:", Object.fromEntries(resp.headers.entries()));

      // Verificar content-type
      const contentType = resp.headers.get("content-type");
      console.log("🔍 Content-Type:", contentType);

      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await resp.json();
        console.log("✅ Datos JSON recibidos:", data);
      } else {
        const text = await resp.text();
        console.error("❌ Respuesta no JSON:", text.substring(0, 200));

        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(`El servidor devolvió HTML. Puede ser un error 404/500. Verifica que el endpoint ${url} exista.`);
        } else {
          throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}...`);
        }
      }

      if (!resp.ok) {
        console.error("❌ Error del servidor:", data);
        throw new Error(data?.message || `Error ${resp.status}: ${resp.statusText}`);
      }

      // Login exitoso
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log("🔑 Token guardado correctamente");
      } else {
        console.warn("⚠️ No se recibió token en la respuesta");
      }

      setStatus({ loading: false, error: null, ok: "¡Login correcto!" });

      // Cargar datos iniciales (sin bloquear el login si falla)
      try {
        await loadInitialData(dispatch, data.token);
        console.log("📊 Datos iniciales cargados correctamente");
      } catch (loadError) {
        console.warn("⚠️ Error cargando datos iniciales (continuando con login):", loadError.message);
        // No bloquear el login - el usuario puede usar la app sin datos iniciales
      }

      // Navegar independientemente del resultado de loadInitialData
      navigate("/");

    } catch (err) {
      console.error("💥 Error en login:", err);
      setStatus({
        loading: false,
        error: err.message || "Error desconocido",
        ok: null
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-800">Bienvenido</h1>
          <p className="text-slate-500 mt-1">Inicia sesión para continuar</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-300 transition"
                value={form.email}
                onChange={onChange}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
              <input
                name="password"
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-300 transition"
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              className="w-full rounded-xl bg-sky-400/90 hover:bg-sky-400 active:bg-sky-500 text-white font-medium py-3 transition disabled:opacity-60"
              disabled={status.loading}
            >
              {status.loading ? "Entrando…" : "Entrar"}
            </button>

            {status.error && (
              <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                <strong>Error:</strong> {status.error}
              </div>
            )}
            {status.ok && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                {status.ok}
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿No tienes cuenta?{" "}
          <a href="/signup" className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline">
            Crea una
          </a>
        </p>

        <p className="text-center text-sm text-slate-500 mt-2">
          ¿Olvidaste tu contraseña?{" "}
          <a href="/forgot" className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline">
            Recupérala
          </a>
        </p>
      </div>
    </div>
  );
};