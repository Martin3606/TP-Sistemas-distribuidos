import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function Login() {
//login de cada parte, como admin o cliente
  const { loginAdmin, loginCliente } = useAuth();
  const navigate = useNavigate();

  function entrarComoAdmin() {
    loginAdmin();
    navigate("/admin");
  }

  function entrarComoCliente() {
    loginCliente();
    navigate("/cliente");
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Renta</h1>
        <p className="login-subtitulo">Sistema de alquiler de vehiculos</p>

        <div className="login-opciones">
          <button className="login-btn admin" onClick={entrarComoAdmin}>
            <span className="login-titulo">Administrador</span>
            <span className="login-desc">Gestion de vehiculos, clientes y reservas</span>
          </button>

          <button className="login-btn cliente" onClick={entrarComoCliente}>
            <span className="login-titulo">Cliente</span>
            <span className="login-desc">Consultar mis reservas y disponibilidad</span>
          </button>
        </div>

        {/* NOTA implementación: cuando el backend tenga /login, reemplazar los botones
            por un formulario con email + contrasenia */}
      </div>
    </div>
  );
}

export default Login;