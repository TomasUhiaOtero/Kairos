import { useState } from "react";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ loading: false, ok: null, error: null });
  const [devToken, setDevToken] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, ok: null, error: null });
    setDevToken("");

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      if (!backend) throw new Error("Falta VITE_BACKEND_URL en .env");
      const base = backend.replace(/\/+$/, "");

      const resp = await fetch(`${base}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "No se pudo procesar la solicitud");

      setStatus({ loading: false, ok: data?.message || "Si el email existe, te enviaremos instrucciones.", error: null });
      if (data?.reset_token_dev_only) setDevToken(data.reset_token_dev_only); // solo para pruebas locales
    } catch (err) {
      setStatus({ loading: false, ok: null, error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-violet-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-800">Recuperar contraseña</h1>
          <p className="text-slate-500 mt-1">Te enviaremos un enlace si el correo existe.</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-300 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <button
              className="w-full rounded-xl bg-sky-400/90 hover:bg-sky-400 active:bg-sky-500 text-white font-medium py-3 transition disabled:opacity-60"
              disabled={status.loading}
            >
              {status.loading ? "Enviando…" : "Enviar instrucciones"}
            </button>

            {status.error && (
              <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">{status.error}</div>
            )}
            {status.ok && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{status.ok}</div>
            )}

            {devToken && (
              <div className="rounded-xl bg-amber-50 text-amber-700 px-4 py-3 text-xs">
                Solo para pruebas locales: token de reset<br />
                <code className="break-all">{devToken}</code><br />
                Úsalo en <a className="underline" href={`/reset?token=${encodeURIComponent(devToken)}`}>esta página</a>.
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <a href="/login" className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline">
            Volver a iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
};
