import React, { useState, useEffect } from "react";
import Lateral from "./Lateral";
import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, User } from "lucide-react";

export const Navbar = () => {
  const [openLateral, setOpenLateral] = useState(false);
  const [fecha, setFecha] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFecha(new Date());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // 🔹 Fecha con año incluido
  const opcionesFecha = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const opcionesHora = { hour: "2-digit", minute: "2-digit" };

  const fechaTexto = new Intl.DateTimeFormat("es-ES", opcionesFecha).format(fecha);
  const horaTexto = new Intl.DateTimeFormat("es-ES", opcionesHora).format(fecha);

  const toggleLateral = () => setOpenLateral(!openLateral);

  const linkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
     ${location.pathname === path
      ? "bg-emerald-700 text-white"
      : "text-gray-700 hover:text-avocado-600 hover:bg-neutral-100"
    }`;

  return (
    <div className="w-full">
      {/* Navigation Bar */}
      <div className="flex justify-center items-center bg-white border-b border-gray-200 p-4 md:grid md:grid-cols-4 md:gap-2 md:text-center">
        {/* Date/Time → solo visible en pantallas medianas o más */}
        <div className="hidden md:block col-span-1 text-xs md:text-sm text-neutral-600">
          <section>Hoy es {fechaTexto}</section>
          <section className="font-medium text-lg">{horaTexto}</section>
        </div>

        {/* Navigation Links */}
        <div className="flex justify-center gap-6 col-span-2">
          <Link to="/" className={linkClass("/")}>
            <Home className="w-5 h-5" />
            <span className="hidden md:inline">Inicio</span>
          </Link>
          <Link to="/eventos-tareas" className={linkClass("/eventos-tareas")}>
            <Calendar className="w-5 h-5" />
            <span className="hidden md:inline">Eventos y tareas</span>
          </Link>
        </div>

        {/* Profile */}
        <div className="col-span-1">
          <button
            className={`flex items-center justify-center gap-2 cursor-pointer rounded py-2 px-4 text-sm font-medium transition-colors
              ${openLateral ? "bg-emerald-700 text-white" : "text-gray-700 hover:bg-neutral-100"}
            `}
            onClick={toggleLateral}
          >
            <User className="w-5 h-5" />
            <span className="hidden md:inline">Perfil</span>
          </button>
        </div>
      </div>

      {/* Lateral Panel */}
      {openLateral && <Lateral onClose={toggleLateral} />}
    </div>
  );
};

export default Navbar;
