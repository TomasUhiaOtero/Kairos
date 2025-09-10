import { useEffect, useState } from "react";

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ loading: false, ok: null, error: null });
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ loading: false, ok: null, error: "Las contraseñas no coinciden" });
      return;
    }

    setStatus({ loading: true, ok: null, error: null });
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");
      const base = backend.replace(/\/+$/, "");

      const resp = await fetch(`${base}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "No se pudo restablecer la contraseña");

      setStatus({ loading: false, ok: data?.message || "Contraseña actualizada", error: null });
    } catch (err) {
      setStatus({ loading: false, ok: null, error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-indigo-50 to-rose-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-800">Restablecer contraseña</h1>
          <p className="text-slate-500 mt-1">Introduce tu nueva contraseña.</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            {!token && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Token</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí tu token"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nueva contraseña</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              className="w-full rounded-xl bg-indigo-400/90 hover:bg-indigo-400 active:bg-indigo-500 text-white font-medium py-3 transition disabled:opacity-60"
              disabled={status.loading}
            >
              {status.loading ? "Actualizando…" : "Actualizar contraseña"}
            </button>

            {status.error && (
              <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">{status.error}</div>
            )}
            {status.ok && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{status.ok}</div>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <a href="/login" className="text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline">
            Volver a iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
};
