import { ROL_LABEL } from "../lib/utils"

const NAV_SECTIONS = [
  {
    label: "Finanzas",
    items: [
      { id: "proyectos",    label: "Proyectos",          icon: "◈", roles: ["admin","gerencia","operaciones","contabilidad","rrhh"] },
      { id: "operaciones",  label: "Registro de Gastos", icon: "◎", roles: ["admin","gerencia","operaciones"] },
      { id: "aprobaciones", label: "Aprobaciones",       icon: "◉", roles: ["admin","gerencia"] },
      { id: "contabilidad", label: "Contabilidad",       icon: "◇", roles: ["admin","gerencia","contabilidad"] },
      { id: "planilla",     label: "Planilla",           icon: "◈", roles: ["admin","gerencia","rrhh"] },
      { id: "dashboard",    label: "Dashboard",          icon: "▣", roles: ["admin","gerencia"] },
      { id: "historico",    label: "Histórico",          icon: "◫", roles: ["admin","gerencia"] },
      { id: "proveedores",  label: "Proveedores",        icon: "◑", roles: ["admin","gerencia","operaciones"] },
    ]
  },
  {
    label: "Operaciones",
    items: [
      { id: "flota", label: "Operaciones", icon: "◐", roles: ["admin","gerencia","operaciones"] },
    ]
  }
]

export default function Sidebar({ active, onNav, usuario }) {
  return (
    <div style={{ width: 220, background: "#1a1a2e", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, padding: "0 0 20px", overflowY: "auto" }}>
      <div style={{ padding: "28px 24px 20px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>TT Audit</div>
        <div style={{ fontSize: 11, color: "#ffffff55", marginTop: 2, letterSpacing: 0.5 }}>MÁRGENES</div>
      </div>

      <nav style={{ flex: 1, padding: "0 12px" }}>
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items.filter(i => i.roles.includes(usuario?.rol))
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#ffffff33", letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 14px 4px" }}>
                {section.label}
              </div>
              {visibleItems.map(item => (
                <button key={item.id} onClick={() => onNav(item.id)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: active === item.id ? "#ffffff15" : "transparent", border: "none", color: active === item.id ? "#fff" : "#ffffff66", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: active === item.id ? 600 : 400, marginBottom: 2, textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "#ffffff08" }}
                  onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                  {item.id === "aprobaciones" && <span style={{ marginLeft: "auto", background: "#E24B4A", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>•</span>}
                </button>
              ))}
            </div>
          )
        })}
      </nav>

      <div style={{ padding: "16px 16px 0", borderTop: "1px solid #ffffff15" }}>
        <div style={{ fontSize: 12, color: "#ffffff66" }}>{usuario?.nombre}</div>
        <div style={{ fontSize: 11, color: "#ffffff33", marginTop: 2 }}>{ROL_LABEL[usuario?.rol]}</div>
      </div>
    </div>
  )
}
