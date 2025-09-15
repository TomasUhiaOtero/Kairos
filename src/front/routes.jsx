// src/front/js/routes.jsx

// Import necessary components and functions from react-router-dom.
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import Calendario from "./pages/Calendario";
import { EventosTareas } from "./pages/EventosTareas";

// 👇 Importamos la page provisional de eventos como default
import EventosPage from "./pages/EventosPage";


export const router = createBrowserRouter(
  createRoutesFromElements(
    // Root Route: All navigation will start from here.
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
      {/* Nested Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />




      <Route path="/calendario" element={<Calendario />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />

      {/* Ruta provisional para ver el componente con datos de prueba */}
      <Route path="/eventos-tareas" element={<EventosTareas />} />
    </Route>
  )
);
