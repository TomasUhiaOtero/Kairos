import { Outlet, Navigate, useLocation } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export const Layout = () => {
  const location = useLocation();
  const token = sessionStorage.getItem("token");

  // rutas públicas permitidas sin login
  const PUBLIC_PATHS = ["/login", "/signup", "/forgot", "/reset"];
  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));

  // si no hay token y la ruta no es pública → redirige a login
  if (!token && !isPublic) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // si ya hay token y entra en login/signup → mándalo al home
  if (token && (location.pathname === "/login" || location.pathname === "/signup")) {
    return <Navigate to="/" replace />;
  }

  return (
    <ScrollToTop>
      <Navbar />
      <Outlet />
      <Footer />
    </ScrollToTop>
  );
};
