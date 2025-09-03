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

      const base = backend.replace(/\/+$/, ""); // limpiar barras finales
      const resp = await fetch(`${base}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "No se pudo iniciar sesión");

      // Guardar token si lo envía el backend
      if (data?.token) localStorage.setItem("token", data.token);

      setStatus({ loading: false, error: null, ok: "¡Login correcto!" });
    } catch (err) {
      setStatus({ loading: false, error: err.message, ok: null });
    }
  };

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h2 className="my-4">Iniciar sesión</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            name="email"
            type="email"
            className="form-control"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input
            name="password"
            type="password"
            className="form-control"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <button className="btn btn-primary w-100" disabled={status.loading}>
          {status.loading ? "Entrando..." : "Entrar"}
        </button>

        {status.error && <div className="alert alert-danger mt-3">{status.error}</div>}
        {status.ok && <div className="alert alert-success mt-3">{status.ok}</div>}
      </form>
    </div>
  );
};
