import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { supabase } from "../lib/supabase"
import { Field, Input } from "./ui"

export default function ProveedorSearch({ ruc, razonSocial, onChange }) {
  const [resultados, setResultados] = useState([])
  const [focoActivo, setFocoActivo] = useState(null)
  const [dropdownRect, setDropdownRect] = useState(null)
  const rucWrapRef = useRef(null)
  const nombreWrapRef = useRef(null)
  const timerRef = useRef(null)

  const buscar = async (q, campo) => {
    if (!q || q.length < 2) { setResultados([]); return }
    const { data } = campo === "ruc"
      ? await supabase.from("proveedores").select("ruc, razon_social").ilike("ruc", `${q}%`).limit(8)
      : await supabase.from("proveedores").select("ruc, razon_social").ilike("razon_social", `%${q}%`).limit(8)
    setResultados(data || [])
  }

  const handleInput = (campo, valor) => {
    onChange(
      campo === "ruc"    ? valor : ruc,
      campo === "nombre" ? valor : razonSocial
    )
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(valor, campo), 280)
  }

  const handleFocus = (campo) => {
    setFocoActivo(campo)
    const wrapRef = campo === "ruc" ? rucWrapRef : nombreWrapRef
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }

  const seleccionar = (p) => {
    onChange(p.ruc, p.razon_social)
    setResultados([])
    setFocoActivo(null)
  }

  const cerrarDropdown = () => setTimeout(() => { setResultados([]); setFocoActivo(null) }, 180)

  const dropdown = focoActivo && resultados.length > 0 && dropdownRect
    ? createPortal(
        <div style={{
          position: "fixed",
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
          zIndex: 9999,
          background: "var(--bg)",
          border: "1.5px solid var(--border)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}>
          {resultados.map((p, i) => (
            <div key={i} onMouseDown={() => seleccionar(p)}
              style={{
                padding: "10px 14px", cursor: "pointer",
                borderBottom: i < resultados.length - 1 ? "1px solid var(--border-light)" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.razon_social}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>RUC {p.ruc}</div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div ref={rucWrapRef}>
        <Field label="RUC Proveedor">
          <Input
            value={ruc}
            onChange={e => handleInput("ruc", e.target.value)}
            onFocus={() => handleFocus("ruc")}
            onBlur={cerrarDropdown}
            placeholder="20123456789"
            maxLength={11}
          />
        </Field>
      </div>
      <div ref={nombreWrapRef}>
        <Field label="Razón social proveedor">
          <Input
            value={razonSocial}
            onChange={e => handleInput("nombre", e.target.value)}
            onFocus={() => handleFocus("nombre")}
            onBlur={cerrarDropdown}
            placeholder="Buscar o escribir nombre..."
          />
        </Field>
      </div>
      {dropdown}
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
