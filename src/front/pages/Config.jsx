// src/front/pages/Config.jsx
import React, { useEffect, useState } from "react";

export default function Config() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("token"); // ajusta si usas otra clave

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // edición de display_name
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [backupDisplayName, setBackupDisplayName] = useState("");

  // edición de password
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/config`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo cargar la configuración");
        setDisplayName(data.display_name || "");
        setBackupDisplayName(data.display_name || "");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API, token]);

  const startEditingName = () => {
    setBackupDisplayName(displayName);
    setIsEditingName(true);
    setMsg(null);
    setError(null);
  };

  const cancelEditingName = () => {
    setDisplayName(backupDisplayName);
    setIsEditingName(false);
  };

  const startEditingPassword = () => {
    setIsEditingPassword(true);
    setCurrentPassword("");
    setNewPassword("");
    setMsg(null);
    setError(null);
  };

  const cancelEditingPassword = () => {
    setIsEditingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const payload = { display_name: displayName };

      // solo mandamos password si el usuario habilitó la edición
      if (isEditingPassword && newPassword.trim()) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await fetch(`${API}/api/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar");

      setMsg(data?.message || "Cambios guardados");
      setIsEditingName(false);
      // si se cambió la contraseña, cerramos la sección y limpiamos
      if (isEditingPassword) {
        setIsEditingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
      }
      setBackupDisplayName(displayName);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Configuración</h1>

        {/* Botón de ayuda "?" */}
        <button
          type="button"
          title="Ver guía"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100"
          onClick={() => alert("Guía rápida:\n• Edita tu nombre de usuario con el lápiz.\n• Para cambiar la contraseña, pulsa el lápiz en la sección Contraseña y rellena los campos.")}
        >
          <span className="font-bold">?</span>
        </button>
      </div>

      {loading && <div className="text-gray-600">Cargando…</div>}
      {!loading && (
        <>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {msg && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
              {msg}
            </div>
          )}

          <form onSubmit={save} className="space-y-6">

            {/* === Nombre de usuario (display_name) === */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre de usuario
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600 ${
                    isEditingName ? "border-gray-300" : "border-gray-200"
                  }`}
                  placeholder="Tu nombre visible"
                  disabled={!isEditingName}
                />

                {/* Lápiz para habilitar la edición */}
                {!isEditingName && (
                  <button
                    type="button"
                    onClick={startEditingName}
                    title="Editar nombre de usuario"
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                        d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.125 19.588 3 21l1.412-4.125L16.862 3.487z" />
                    </svg>
                  </button>
                )}
              </div>

              {!isEditingName && (
                <p className="text-xs text-gray-500 mt-1">
                  Bloqueado. Pulsa el lápiz para editar.
                </p>
              )}

              {isEditingName && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={cancelEditingName}
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* === Contraseña === */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Contraseña</label>

                {!isEditingPassword && (
                  <button
                    type="button"
                    onClick={startEditingPassword}
                    title="Cambiar contraseña"
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                  >
                    {/* Lápiz */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                        d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.125 19.588 3 21l1.412-4.125L16.862 3.487z" />
                    </svg>
                  </button>
                )}
              </div>

              {!isEditingPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  Bloqueado. Pulsa el lápiz para cambiar tu contraseña.
                </p>
              )}

              {isEditingPassword && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Tu contraseña actual"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Tu nueva contraseña"
                      autoComplete="new-password"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Para cambiar la contraseña debes introducir la actual.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelEditingPassword}
                      className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* === Botón Guardar global === */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  (!isEditingName && !(isEditingPassword && newPassword.trim()))
                }
                className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
