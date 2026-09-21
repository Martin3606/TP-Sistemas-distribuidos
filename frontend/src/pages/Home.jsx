import { Link } from "react-router-dom";

function Home() {
  const cards = [
    {
      title: "Flota de Vehículos",
      description: "Gestioná la flota, altas, ediciones y precios de alquiler.",
      icon: "🚗",
      path: "/vehiculos",
      borderColor: "#ffc107",
      buttonColor: "#ffc107",
      textColor: "#212529",
    },
    {
      title: "Gestión de Clientes",
      description: "Administrá el padrón de clientes, altas y modificaciones.",
      icon: "👥",
      path: "/clientes",
      borderColor: "#007bff",
      buttonColor: "#007bff",
      textColor: "#ffffff",
    },
    {
      title: "Nueva Reserva",
      description: "Consultá disponibilidad (GraphQL) y registrá alquileres (REST).",
      icon: "📅",
      path: "/reservas",
      borderColor: "#28a745",
      buttonColor: "#28a745",
      textColor: "#ffffff",
    },
    {
      title: "Historial",
      description: "Revisá el estado de los alquileres y realizá cancelaciones.",
      icon: "📋",
      path: "/historial",
      borderColor: "#17a2b8",
      buttonColor: "#17a2b8",
      textColor: "#ffffff",
    },
  ];

  return (
    <section style={{ padding: "15px", display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: "12px",
          boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
          padding: "25px 15px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ fontSize: "2em", margin: "0 0 10px 0", color: "#333" }}>
          Panel de Control — Rentar
        </h1>
        <p style={{ fontSize: "1.05em", color: "#666", marginBottom: "30px", marginTop: 0 }}>
          Bienvenido al sistema de alquiler de vehículos. Seleccioná un módulo para comenzar a operar.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
          }}
        >
          {cards.map((c) => (
            <Link
              key={c.path}
              to={c.path}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "25px 20px",
                textDecoration: "none",
                color: "#333",
                boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
                borderTop: `4px solid ${c.borderColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "transform 0.2s, boxShadow 0.2s",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "2.5em", marginBottom: "12px" }}>{c.icon}</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2em", color: "#222" }}>{c.title}</h3>
              <p style={{ fontSize: "0.88em", color: "#666", margin: "0 0 15px 0", lineHeight: "1.4" }}>
                {c.description}
              </p>
              <span
                style={{
                  padding: "8px 16px",
                  backgroundColor: c.buttonColor,
                  color: c.textColor,
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "0.9em",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  display: "inline-block",
                  marginTop: "auto",
                }}
              >
                Acceder &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;