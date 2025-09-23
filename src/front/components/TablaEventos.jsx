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

// Fondo suave a partir de HEX (#RRGGBB) — mismo alpha que en el calendario ('30')
const softBg = (hex) => {
  const base = /^#([0-9a-f]{6})$/i.test(hex || "") ? hex : "#94a3b8";
  return `${base}30`;
};

// --- parseo seguro de fechas ---
const safeParse = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  // Solo fecha -> crear Date local en medianoche
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  // ISO con hora -> usar Date (se interpreta en local)
  return new Date(s);
};

// --- helpers de día local ---
const atMidnight = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const localDayKey = (d) => {
  // clave YYYY-MM-DD en zona local
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
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
  const [filtro, setFiltro] = useState("todos");
  const [open, setOpen] = useState(false);

  // Hoy (solo día)
  const hoy = useMemo(() => atMidnight(new Date()), []);
  const semIni = useMemo(() => startOfWeek(new Date()), []);
  const semFin = useMemo(() => endOfWeek(new Date()), []);

  // Normaliza a objetos Date
  const normalizados = useMemo(
    () =>
      (eventos || [])
        .map((e) => {
          const _start = safeParse(e.start_date);
          const _end = e.end_date ? safeParse(e.end_date) : null;
          return {
            ...e,
            _start,
            _end,
          };
        })
        .sort((a, b) => a._start - b._start),
    [eventos]
  );

  // ❗ Oculta eventos de días anteriores (comparación por DÍA local)
  // Si tiene end, usamos end; si no, usamos start. Comparamos atMidnight.
  const futuros = useMemo(() => {
    return normalizados.filter((e) => {
      const ref = e._end || e._start;
      if (!ref) return false;
      return atMidnight(ref) >= hoy; // solo hoy en adelante
    });
  }, [normalizados, hoy]);

  // Contadores por apartado (sobre los futuros)
  const counts = useMemo(() => {
    const total = futuros.length;
    let today = 0;
    let week = 0;

    for (const e of futuros) {
      const s = new Date(e._start);
      if (isSameDay(s, hoy)) today++;
      if (s >= semIni && s <= semFin) week++;
    }
    return { total, today, week };
  }, [futuros, hoy, semIni, semFin]);

  // Aplica el filtro seleccionado (sobre los futuros)
  const eventosFiltrados = useMemo(() => {
    if (filtro === "hoy") {
      return futuros.filter((e) => isSameDay(e._start, hoy));
    }
    if (filtro === "semana") {
      return futuros.filter((e) => e._start >= semIni && e._start <= semFin);
    }
    return futuros; // todos los no pasados
  }, [futuros, filtro, hoy, semIni, semFin]);

  // Agrupa por día tras filtrar — usando clave local (no toISOString)
  const grupos = useMemo(() => {
    const byDay = new Map();
    for (const e of eventosFiltrados) {
      const key = localDayKey(e._start); // clave local YYYY-MM-DD
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(e);
    }
    return Array.from(byDay.entries()).map(([k, list]) => {
      const [y, m, d] = k.split("-").map(Number);
      return {
        key: k,
        date: new Date(y, m - 1, d, 0, 0, 0, 0),
        list,
      };
    });
  }, [eventosFiltrados]);

  return (
    <div className="flex flex-col items-center space-y-6">

  {/* Encabezado */}
  <div className="relative w-full max-w-lg flex items-center justify-center">
    <h1 className="text-2xl font-bold">Eventos</h1>
    <button
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="absolute right-0 text-sky-600 text-sm hover:text-sky-800 transition-colors"
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

  {/* my-card de eventos */}
  <div className="w-full max-w-2xl rounded-2xl bg-white p-4 space-y-6 my-card mt-3">
    {grupos.map(({ key, date, list }) => (
      <section key={key} className="space-y-3">
        <h2 className="text-md font-medium text-gray-600 mb-2">
          {fmtFechaCabecera(date)}
        </h2>

        <div className="space-y-3">
          {list.map((e) => {
            const color =
              /^#([0-9a-f]{6})$/i.test(e.color || "") ? e.color : "#94a3b8";
            const isAllDay = !!e.all_day;
            return (
              <div
                key={e.id}
                className="grid grid-cols-[60px_2px_1fr] items-center"
              >
                {/* Hora */}
                <div className="text-[11px] leading-tight text-slate-700 text-right pr-1">
                  <div className="font-medium">
                    {isAllDay ? "Todo el día" : fmtHora(e._start)}
                  </div>
                  {!isAllDay && e._end && (
                    <div className="text-slate-400">{fmtHora(e._end)}</div>
                  )}
                </div>

                {/* Línea vertical */}
                <div className="bg-slate-500 rounded-full w-[1px] h-full min-h-[10px]" />

                {/* Pastilla */}
                <div className="pl-2">
                  <span
                    className="inline-block rounded-lg px-3 py-1.5 text-xs font-medium w-full"
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
      <div className="text-gray-400 text-sm p-4 text-center">Sin eventos</div>
    )}
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
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full ${
          activo ? "bg-sky-100" : "bg-slate-100"
        }`}
      >
        {badge}
      </span>
    </button>
  );
}
