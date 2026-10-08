import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const user = await login(email, password);
      if (user.rol === "ADMIN") {
        navigate("/vehiculos");
      } else {
        navigate("/catalogo");
      }
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  function cargarDemoAdmin() {
    setEmail("admin@rentar.com");
    setPassword("admin123");
  }

  function cargarDemoCliente() {
    setEmail("juan.perez@mail.com");
    setPassword("cliente123");
  }

  return (
    <div className="login-container" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "75vh",
      padding: "1rem"
    }}>
      <div className="login-card" style={{
        backgroundColor: "#1e293b",
        color: "white",
        padding: "2.5rem",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center"
      }}>
        <h1 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8", fontSize: "2rem" }}>Rentar</h1>
        <p className="login-subtitulo" style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          Sistema de Alquiler de Vehículos
        </p>

        {error && (
          <div style={{
            backgroundColor: "#7f1d1d",
            color: "#fca5a5",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            border: "1px solid #ef4444"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@rentar.com"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{
              padding: "0.85rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#0284c7",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: cargando ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            }}
          >
            {cargando ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", borderTop: "1px solid #334155", paddingTop: "1.2rem" }}>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
            Credenciales de prueba rápida:
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={cargarDemoAdmin}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                border: "1px solid #38bdf8",
                backgroundColor: "transparent",
                color: "#38bdf8",
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={cargarDemoCliente}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                border: "1px solid #4ade80",
                backgroundColor: "transparent",
                color: "#4ade80",
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              Demo Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;