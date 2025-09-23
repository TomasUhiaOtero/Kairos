import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { authFetch, loadInitialData } from "../lib/api";
import logo from "../../../logo_grande.png"
import Logo from "../components/Logo";

// 🔹 Overlay de carga (pantalla completa)
const LoaderOverlay = ({ title = "Entrando…", subtitle = "Cargando tu calendario" }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <svg
          className="h-12 w-12 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: null, ok: null });
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useGlobalReducer();

  // si venía de una página protegida, vuelve allí; si no, al Home
  const from = location.state?.from?.pathname || "/";

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // si ya hay sesión y se abre /login, redirige
  useEffect(() => {
    const existing = sessionStorage.getItem("token");
    if (existing) navigate(from, { replace: true });
  }, [navigate, from]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, ok: null });

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");
      const base = backend.replace(/\/+$/, "");

      const url = `${base}/api/login`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(form),
      });

      const contentType = resp.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(`El servidor devolvió HTML. Verifica que el endpoint ${url} exista.`);
        } else {
          throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}...`);
        }
      }

      if (!resp.ok) {
        throw new Error(data?.message || `Error ${resp.status}: ${resp.statusText}`);
      }

      // 🔹 Usa sessionStorage para alinear con el guard del Layout
      if (data.token) {
        sessionStorage.setItem("token", data.token);
      } else {
        console.warn("⚠️ No se recibió token en la respuesta");
      }

      setStatus({ loading: true, error: null, ok: "¡Login correcto!" }); // mantenemos loading mientras se cargan datos

      // 🔹 Cargar datos iniciales (calendario, etc). Si falla, no bloquea la navegación.
      try {
        await loadInitialData(dispatch, data.token);
      } catch (loadError) {
        console.warn("⚠️ Error cargando datos iniciales (continuando):", loadError.message);
      }

      // 🔹 Cuando termina, navegamos y así quitamos el overlay al cambiar de página
      navigate(from, { replace: true });
    } catch (err) {
      setStatus({
        loading: false,
        error: err.message || "Error desconocido",
        ok: null
      });
    }
  };

  const isDisabled = status.loading;

  return (
    <div className="min-h-screen  from-rose-50 via-sky-50 to-emerald-50 flex items-center justify-center px-4 relative">
      {/* 🔹 Overlay durante la carga */}
      {status.loading && <LoaderOverlay title="Entrando…" subtitle="Cargando tu calendario" />}

      <div className="w-full max-w-md">
        <div className="mb-6 text-center px-4 sm:px-6 md:px-8 lg:px-0">
  <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800 mb-4">
    Bienvenido a
  </h1>
  <Logo/>
  <p className="text-sm sm:text-base md:text-lg text-slate-500 mt-4">
    Inicia sesión para continuar
  </p>
</div>

        <div className="bg-white/80 backdrop-blur  shadow-xl my-card border-white/60 p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-300 transition disabled:opacity-60"
                value={form.email}
                onChange={onChange}
                placeholder="tucorreo@ejemplo.com"
                required
                disabled={isDisabled} // 🔹 desactivar mientras carga
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
              <input
                name="password"
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-300 transition disabled:opacity-60"
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                required
                disabled={isDisabled} // 🔹 desactivar mientras carga
              />
            </div>

            <button
              className="w-full my-btn inline-flex items-center justify-center gap-2 rounded-xl  font-medium py-3 transition disabled:opacity-60"
              disabled={isDisabled}
            >
              {/* 🔹 Spinner en el botón */}
              {status.loading && (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              )}
              {status.loading ? "Entrando…" : "Entrar"}
            </button>

            {status.error && (
              <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                <strong>Error:</strong> {status.error}
              </div>
            )}
            {status.ok && !status.loading && (
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
