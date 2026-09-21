import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Vehiculos from "./pages/Vehiculos.jsx";
import Clientes from "./pages/Clientes.jsx";
import Reservas from "./pages/Reservas.jsx";
import Historial from "./pages/Historial.jsx";

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vehiculos" element={<Vehiculos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/reservas" element={<Reservas />} />
          <Route path="/historial" element={<Historial />} />
        </Routes>
      </main>
      <footer className="footer">
        Rentar - TP Sistemas Distribuidos (UNLa) - Grupo H
      </footer>
    </div>
  );
}

export default App;
