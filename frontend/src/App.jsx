import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./auth/RutaProtegida.jsx";

import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Vehiculos from "./pages/Vehiculos.jsx";
import Clientes from "./pages/Clientes.jsx";
import Reservas from "./pages/Reservas.jsx";
import Historial from "./pages/Historial.jsx";
import MisReservas from "./pages/MisReservas.jsx";
import MiPerfil from "./pages/MiPerfil.jsx";

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="contenido">
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={
            <RutaProtegida rolesPermitidos={["ADMIN"]}><Home /></RutaProtegida>
          } />
          <Route path="/admin/vehiculos" element={
            <RutaProtegida rolesPermitidos={["ADMIN"]}><Vehiculos /></RutaProtegida>
          } />
          <Route path="/admin/clientes" element={
            <RutaProtegida rolesPermitidos={["ADMIN"]}><Clientes /></RutaProtegida>
          } />
          <Route path="/admin/reservas" element={
            <RutaProtegida rolesPermitidos={["ADMIN"]}><Reservas /></RutaProtegida>
          } />
          <Route path="/admin/historial" element={
            <RutaProtegida rolesPermitidos={["ADMIN"]}><Historial /></RutaProtegida>
          } />

          {/* Cliente */}
          <Route path="/cliente" element={
            <RutaProtegida rolesPermitidos={["CLIENTE"]}><Home /></RutaProtegida>
          } />
          <Route path="/cliente/mis-reservas" element={
            <RutaProtegida rolesPermitidos={["CLIENTE"]}><MisReservas /></RutaProtegida>
          } />
          <Route path="/cliente/perfil" element={
            <RutaProtegida rolesPermitidos={["CLIENTE"]}><MiPerfil /></RutaProtegida>
          } />

          {/* Raíz -> al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      <footer className="footer">Rentar - TP Sistemas Distribuidos (UNLa)</footer>
    </div>
  );
}

export default App;
