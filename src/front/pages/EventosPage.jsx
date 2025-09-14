// src/front/pages/EventosPage.jsx
import React from "react";
import TablaEventos from "../components/TablaEventos";

export default function EventosPage() {
  // Datos de prueba (usa HEX para que el fondo suave se calcule bien)
  const eventos = [
    {
      id: 1,
      title: "Clase",
      start_date: "2025-08-25T10:00:00",
      end_date:   "2025-08-25T11:00:00",
      color: "#a855f7", // violeta
    },
    {
      id: 2,
      title: "Reunión",
      start_date: "2025-08-25T12:30:00",
      end_date:   "2025-08-25T13:15:00",
      color: "#0ea5e9", // celeste
    },
    {
      id: 3,
      title: "Gimnasio",
      start_date: "2025-08-26T19:00:00",
      end_date:   "2025-08-26T20:00:00",
      color: "#22c55e", // verde
    },
    {
      id: 4,
      title: "Clase",
      start_date: "2025-09-14T10:00:00",
      end_date:   "2025-09-14T11:00:00",
      color: "#278787ff", // violeta
    },
    {
      id: 5,
      title: "Clase",
      start_date: "2025-09-16T10:00:00",
      end_date:   "2025-09-16T11:00:00",
      color: "#4c0733ff", // violeta
    },
  ];

  return <TablaEventos eventos={eventos} />;
}
