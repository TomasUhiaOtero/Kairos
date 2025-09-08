import { useState } from "react";

export const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: null, ok: null });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, ok: null });

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");

      const base = backend.replace(/\/+$/, "");
      const resp = await fetch(`${base}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "No se pudo iniciar sesión");

      if (data?.token) localStorage.setItem("token", data.token);

      setStatus({ loading: false, error: null, ok: "¡Login correcto!" });
    } catch (err) {
      setStatus({ loading: false, error: err.message, ok: null });
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
                {status.error}
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
      </div>
    </div>
  );
};
