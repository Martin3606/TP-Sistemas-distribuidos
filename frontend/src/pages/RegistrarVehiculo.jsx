import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrarVehiculoExterno } from "../services/api";
import "./ClientePages.css";

function RegistrarVehiculo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patente: "",
    marca: "",
    modelo: "",
    anio: 2024,
    color: "",
    tipo_vehiculo: "SEDAN",
    precio_diario: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Forzamos la patente a mayúsculas en tiempo real
    const finalValue = name === "patente" ? value.toUpperCase() : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registrarVehiculoExterno({
        ...formData,
        anio: parseInt(formData.anio, 10),
        precio_diario: parseFloat(formData.precio_diario)
      });
      alert("¡Vehículo enviado a verificación con éxito!");
      navigate("/mis-vehiculos");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="cliente-panel" style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "1.5rem" }}>
        <p className="eyebrow" style={{ color: "#38bdf8", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
          Alta de Vehículo
        </p>
        <h1 style={{ margin: "0.25rem 0", fontSize: "2rem", color: "#0f172a" }}>Registrar mi Vehículo</h1>
        <p style={{ color: "#64748b" }}>Completá los datos de tu auto para sumarlo a la flota de Rentar. Una vez verificado, estará disponible en el catálogo.</p>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Patente *</label>
            <input type="text" name="patente" required value={formData.patente} onChange={handleChange} placeholder="Ej: AB123CD" style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Marca *</label>
            <input type="text" name="marca" required value={formData.marca} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Modelo *</label>
            <input type="text" name="modelo" required value={formData.modelo} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Año *</label>
            <input type="number" name="anio" required min="1990" max="2027" value={formData.anio} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Color</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Categoría *</label>
            <select name="tipo_vehiculo" value={formData.tipo_vehiculo} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem", backgroundColor: "white" }}>
              <option value="SEDAN">Sedán</option>
              <option value="SUV">SUV</option>
              <option value="PICKUP">Pickup</option>
              <option value="COUPE">Coupé</option>
              <option value="HATCHBACK">Hatchback</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#334155", fontSize: "0.9rem" }}>Precio Diario Estimado ($) *</label>
            <input type="number" name="precio_diario" required min="1000" step="100" value={formData.precio_diario} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem" }} />
          </div>
        </div>
        
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => navigate("/mis-vehiculos")} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#0ea5e9", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(14, 165, 233, 0.2)" }}>
            {loading ? "Enviando..." : "Enviar a Verificación"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default RegistrarVehiculo;