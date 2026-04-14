import { useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import { Field, Input } from "./ui"

export default function ProveedorSearch({ ruc, razonSocial, onChange }) {
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [focoActivo, setFocoActivo] = useState(null) // "ruc" | "nombre"
  const timerRef = useRef(null)

  const buscar = async (q, campo) => {
    if (!q || q.length < 2) { setResultados([]); return }
    setCargando(true)
    const filtro = campo === "ruc"
      ? `ruc.ilike.${q}%`
      : `razon_social.ilike.%${q}%`
    const { data } = await supabase.from("proveedores").select("ruc, razon_social").or(filtro).limit(8)
    setResultados(data || [])
    setCargando(false)
  }

  const handleInput = (campo, valor) => {
    onChange(
      campo === "ruc"    ? valor : ruc,
      campo === "nombre" ? valor : razonSocial
    )
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(valor, campo), 280)
  }

  const seleccionar = (p) => {
    onChange(p.ruc, p.razon_social)
    setResultados([])
    setFocoActivo(null)
  }

  const cerrarDropdown = () => setTimeout(() => { setResultados([]); setFocoActivo(null) }, 180)

  const Dropdown = ({ campo }) => {
    if (focoActivo !== campo || resultados.length === 0) return null
    return (
      <div style={{
        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
        background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", marginTop: 4,
      }}>
        {resultados.map((p, i) => (
          <div key={i} onMouseDown={() => seleccionar(p)}
            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < resultados.length - 1 ? "1px solid var(--border-light)" : "none", transition: "background 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.razon_social}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>RUC {p.ruc}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ position: "relative" }}>
        <Field label="RUC Proveedor">
          <Input
            value={ruc}
            onChange={e => handleInput("ruc", e.target.value)}
            onFocus={() => setFocoActivo("ruc")}
            onBlur={cerrarDropdown}
            placeholder="20123456789"
            maxLength={11}
          />
        </Field>
        <Dropdown campo="ruc" />
      </div>
      <div style={{ position: "relative" }}>
        <Field label="Razón social proveedor">
          <Input
            value={razonSocial}
            onChange={e => handleInput("nombre", e.target.value)}
            onFocus={() => setFocoActivo("nombre")}
            onBlur={cerrarDropdown}
            placeholder="Buscar o escribir nombre..."
          />
        </Field>
        <Dropdown campo="nombre" />
      </div>
    </div>
  )
}

// Helper: guardar proveedor nuevo al registrar un gasto (fire & forget)
export const guardarProveedor = (ruc, razonSocial) => {
  if (!ruc || !razonSocial) return
  supabase.from("proveedores")
    .upsert({ ruc, razon_social: razonSocial }, { onConflict: "ruc" })
    .then(() => {})
}
