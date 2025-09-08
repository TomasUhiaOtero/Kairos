import { useState } from "react";

export const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    display_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [status, setStatus] = useState({ loading: false, error: null, ok: null });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirm) {
      setStatus({ loading: false, error: "Las contraseñas no coinciden", ok: null });
      return;
    }

    setStatus({ loading: true, error: null, ok: null });
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");

      const base = backend.replace(/\/+$/, "");
      const resp = await fetch(`${base}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          display_name: form.display_name || form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "No se pudo crear la cuenta");

      if (data?.token) localStorage.setItem("token", data.token);

      setStatus({ loading: false, error: null, ok: "¡Cuenta creada! Ya puedes iniciar sesión." });
    } catch (err) {
      setStatus({ loading: false, error: err.message, ok: null });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-amber-50 to-sky-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-800">Crear cuenta</h1>
          <p className="text-slate-500 mt-1">Únete con un estilo minimalista 💫</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
                <input
                  name="name"
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-300 transition"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Tu nombre real"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre visible</label>
                <input
                  name="display_name"
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-300 transition"
                  value={form.display_name}
                  onChange={onChange}
                  placeholder="Cómo quieres que te vean (opcional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-300 transition"
                value={form.email}
                onChange={onChange}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-300 transition"
                  value={form.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Confirmar contraseña</label>
                <input
                  name="confirm"
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-300 transition"
                  value={form.confirm}
                  onChange={onChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              className="w-full rounded-xl bg-violet-400/90 hover:bg-violet-400 active:bg-violet-500 text-white font-medium py-3 transition disabled:opacity-60"
              disabled={status.loading}
            >
              {status.loading ? "Creando…" : "Crear cuenta"}
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
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-violet-600 hover:text-violet-700 underline-offset-2 hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
};
