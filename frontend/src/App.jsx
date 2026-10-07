import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";
import Vehiculos from "./pages/Vehiculos.jsx";
import Clientes from "./pages/Clientes.jsx";
import Reservas from "./pages/Reservas.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import MisReservas from "./pages/MisReservas.jsx";
import HistorialCliente from "./pages/HistorialCliente.jsx";
import RutaProtegida from "./auth/RutaProtegida.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

function App() {
  const { isAuthenticated, rol } = useAuth();

  return (
    <div className="app-container">
      <Navbar />
      <main className="contenido">
        <Routes>
          {/* Ruta pública de Login */}
          <Route path="/login" element={<Login />} />

          {/* Redirección inteligente en la raíz */}
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : rol === "ADMIN" ? (
                <Navigate to="/vehiculos" replace />
              ) : (
                <Navigate to="/catalogo" replace />
              )
            }
          />

          {/* Rutas de ADMINISTRADOR */}
          <Route
            path="/vehiculos"
            element={
              <RutaProtegida rolesPermitidos={["ADMIN"]}>
                <Vehiculos />
              </RutaProtegida>
            }
          />
          <Route
            path="/clientes"
            element={
              <RutaProtegida rolesPermitidos={["ADMIN"]}>
                <Clientes />
              </RutaProtegida>
            }
          />
          <Route
            path="/reservas"
            element={
              <RutaProtegida rolesPermitidos={["ADMIN"]}>
                <Reservas />
              </RutaProtegida>
            }
          />

          {/* Rutas de CLIENTE */}
          <Route
            path="/catalogo"
            element={
              <RutaProtegida rolesPermitidos={["CLIENTE"]}>
                <Catalogo />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-reservas"
            element={
              <RutaProtegida rolesPermitidos={["CLIENTE"]}>
                <MisReservas />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial-cliente"
            element={
              <RutaProtegida rolesPermitidos={["CLIENTE"]}>
                <HistorialCliente />
              </RutaProtegida>
            }
          />

          {/* Fallback para cualquier otra ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        Rentar - TP Sistemas Distribuidos (UNLa)
      </footer>
    </div>
  );
}

export default App;
