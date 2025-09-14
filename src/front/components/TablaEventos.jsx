// src/front/components/TablaEventos.jsx
import React, { useMemo, useState } from "react";

// ---- helpers de formato ----
const fmtFechaCabecera = (d) =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(d)
    .replace(/^./, (c) => c.toUpperCase());

const fmtHora = (d) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

// Fondo suave a partir de HEX (#RRGGBB)
const softBg = (hex) => {
  const base = /^#([0-9a-f]{6})$/i.test(hex || "") ? hex : "#a855f7";
  return `${base}1A`; // alpha ~10%
};

// ---- lógica de fechas ----
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=dom, 1=lun...
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day); // domingo
  return x;
};
const endOfWeek = (d) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6); // sábado
  e.setHours(23, 59, 59, 999);
  return e;
};

export default function TablaEventos({ eventos = [] }) {
  const [filtro, setFiltro] = useState("todos"); // "todos" | "hoy" | "semana"
  const [open, setOpen] = useState(false);

  // Normaliza a objetos Date
  const normalizados = useMemo(
    () =>
      (eventos || [])
        .map((e) => ({
          ...e,
          _start: e.start_date instanceof Date ? e.start_date : new Date(e.start_date),
          _end: e.end_date ? (e.end_date instanceof Date ? e.end_date : new Date(e.end_date)) : null,
        }))
        .sort((a, b) => a._start - b._start),
    [eventos]
  );

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const semIni = useMemo(() => startOfWeek(new Date()), []);
  const semFin = useMemo(() => endOfWeek(new Date()), []);

  // Contadores por apartado
  const counts = useMemo(() => {
    const total = normalizados.length;
    let today = 0;
    let week = 0;

    for (const e of normalizados) {
      const s = new Date(e._start);
      if (isSameDay(s, hoy)) today++;
      if (s >= semIni && s <= semFin) week++;
    }
    return { total, today, week };
  }, [normalizados, hoy, semIni, semFin]);

  // Aplica el filtro seleccionado
  const eventosFiltrados = useMemo(() => {
    if (filtro === "hoy") {
      return normalizados.filter((e) => isSameDay(e._start, hoy));
    }
    if (filtro === "semana") {
      return normalizados.filter((e) => e._start >= semIni && e._start <= semFin);
    }
    return normalizados; // todos
  }, [normalizados, filtro, hoy, semIni, semFin]);

  // Agrupa por día tras filtrar
  const grupos = useMemo(() => {
    const byDay = new Map();
    for (const e of eventosFiltrados) {
      const key = e._start.toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(e);
    }
    return Array.from(byDay.entries()).map(([k, list]) => ({
      key: k,
      date: new Date(k),
      list,
    }));
  }, [eventosFiltrados]);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Eventos</h1>

          {/* Botón + menú de filtro */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-xs font-medium rounded-lg border px-3 py-1.5 hover:bg-slate-50"
            >
              Filtrar
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border bg-white shadow-lg p-1 z-20">
                <ItemFiltro
                  activo={filtro === "todos"}
                  etiqueta="Todos"
                  badge={counts.total}
                  onClick={() => {
                    setFiltro("todos");
                    setOpen(false);
                  }}
                />
                <ItemFiltro
                  activo={filtro === "hoy"}
                  etiqueta="Hoy"
                  badge={counts.today}
                  onClick={() => {
                    setFiltro("hoy");
                    setOpen(false);
                  }}
                />
                <ItemFiltro
                  activo={filtro === "semana"}
                  etiqueta="Esta semana"
                  badge={counts.week}
                  onClick={() => {
                    setFiltro("semana");
                    setOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="space-y-6 px-4 pb-4">
          {grupos.map(({ key, date, list }) => (
            <section key={key} className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">
                {fmtFechaCabecera(date)}
              </h2>

              <div className="space-y-3">
                {list.map((e) => {
                  const color = /^#([0-9a-f]{6})$/i.test(e.color || "") ? e.color : "#a855f7";
                  return (
                    <div key={e.id} className="grid grid-cols-[60px_2px_1fr] items-start">
                      {/* Hora */}
                      <div className="text-[11px] leading-tight text-slate-700 text-right pr-1">
                        <div className="font-medium">{fmtHora(e._start)}</div>
                        {e._end && <div className="text-slate-400">{fmtHora(e._end)}</div>}
                      </div>

                      {/* Línea vertical */}
                      <div className="bg-slate-800 rounded-full h-full min-h-[18px]" />

                      {/* Pastilla */}
                      <div className="pl-2">
                        <span
                          className="inline-block rounded-lg px-3 py-1.5 text-xs font-medium"
                          style={{ backgroundColor: softBg(color), color }}
                        >
                          {e.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {grupos.length === 0 && (
            <div className="text-slate-400 text-sm py-6">Sin eventos</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Ítem del menú de filtro con badge ---
function ItemFiltro({ etiqueta, badge, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
        activo ? "bg-sky-50 text-sky-700" : "hover:bg-slate-50"
      }`}
    >
      <span>{etiqueta}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${activo ? "bg-sky-100" : "bg-slate-100"}`}>
        {badge}
      </span>
    </button>
  );
}
