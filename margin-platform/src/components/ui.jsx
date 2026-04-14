import { ESTADOS_LABEL, ESTADOS_COLOR, TIPO_GASTO_LABEL, TIPO_GASTO_COLOR, ESTADO_GASTO_LABEL, ESTADO_GASTO_COLOR } from "../lib/utils"

export const Badge = ({ estado }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    background: ESTADOS_COLOR[estado] + "22",
    color: ESTADOS_COLOR[estado],
    border: `1px solid ${ESTADOS_COLOR[estado]}44`
  }}>{ESTADOS_LABEL[estado] || estado}</span>
)

export const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #e5e5e5", borderTopColor: "#1a1a2e", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  </div>
)

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)", padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#E24B4A", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
)

export const Input = (props) => (
  <input {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none", transition: "border-color 0.15s", ...props.style }} />
)

export const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none", ...props.style }}>
    {children}
  </select>
)

export const Btn = ({ variant = "primary", children, ...props }) => {
  const styles = {
    primary:   { background: "#1a1a2e", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "var(--text)", border: "1.5px solid var(--border)" },
    danger:    { background: "#E24B4A22", color: "#E24B4A", border: "1.5px solid #E24B4A44" },
    success:   { background: "#1D9E7522", color: "#1D9E75", border: "1.5px solid #1D9E7544" },
  }
  return (
    <button {...props} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity 0.15s", ...styles[variant], ...props.style }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  )
}

export const BadgeGasto = ({ tipo, estado }) => {
  const color = estado ? ESTADO_GASTO_COLOR[estado] : TIPO_GASTO_COLOR[tipo]
  const label = estado ? ESTADO_GASTO_LABEL[estado] : TIPO_GASTO_LABEL[tipo]
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{label || tipo || estado}</span>
  )
}
