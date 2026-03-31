import { useState, useEffect, createContext, useContext } from "react"
import { createClient } from "@supabase/supabase-js"

// ── Supabase client ──────────────────────────────────────────
// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = "https://nnifhrcttzmxxqdvywdw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWZocmN0dHpteHhxZHZ5d2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODQwMzAsImV4cCI6MjA5MDM2MDAzMH0.xVLJYWAXRFWE8H8h2n9QaiHiYce5gi51bmiWKKNn98g"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Auth Context ─────────────────────────────────────────────
const AuthContext = createContext(null)
const useAuth = () => useContext(AuthContext)

// ── Utilidades ───────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(n || 0)
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`
const today = () => new Date().toISOString().split("T")[0]
const periodoActual = () => new Date().toISOString().slice(0, 7)

const ESTADOS_LABEL = {
  activo: "Activo", cerrado: "Cerrado", suspendido: "Suspendido"
}
const ESTADOS_COLOR = {
  activo: "#1D9E75", cerrado: "#888780", suspendido: "#BA7517"
}
const ROL_LABEL = {
  admin: "Admin", gerencia: "Gerencia", operaciones: "Operaciones",
  contabilidad: "Contabilidad", rrhh: "RRHH"
}

// ── Componentes base ─────────────────────────────────────────
const Badge = ({ estado }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    background: ESTADOS_COLOR[estado] + "22",
    color: ESTADOS_COLOR[estado],
    border: `1px solid ${ESTADOS_COLOR[estado]}44`
  }}>{ESTADOS_LABEL[estado] || estado}</span>
)

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #e5e5e5", borderTopColor: "#1a1a2e", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  </div>
)

const Modal = ({ open, onClose, title, children }) => {
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

const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#E24B4A", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
)

const Input = (props) => (
  <input {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none", transition: "border-color 0.15s", ...props.style }} />
)

const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none", ...props.style }}>
    {children}
  </select>
)

const Btn = ({ variant = "primary", children, ...props }) => {
  const styles = {
    primary: { background: "#1a1a2e", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "var(--text)", border: "1.5px solid var(--border)" },
    danger: { background: "#E24B4A22", color: "#E24B4A", border: "1.5px solid #E24B4A44" },
    success: { background: "#1D9E7522", color: "#1D9E75", border: "1.5px solid #1D9E7544" },
  }
  return (
    <button {...props} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity 0.15s", ...styles[variant], ...props.style }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  )
}

// ── LOGIN ────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else onLogin(data.session)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}>
      <div style={{ width: 400, background: "var(--bg)", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: "#1a1a2e" }}>TT Audit</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Plataforma de márgenes</div>
        </div>
        <form onSubmit={handleLogin}>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@ttaudit.com" required />
          </Field>
          <Field label="Contraseña" required>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          {error && <div style={{ color: "#E24B4A", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}
          <Btn style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Btn>
        </form>
      </div>
    </div>
  )
}

// ── SIDEBAR ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "proyectos", label: "Proyectos", icon: "◈", roles: ["admin","gerencia","operaciones","contabilidad","rrhh"] },
  { id: "operaciones", label: "Operaciones", icon: "◎", roles: ["admin","gerencia","operaciones"] },
  { id: "aprobaciones", label: "Aprobaciones", icon: "◉", roles: ["admin","gerencia"] },
  { id: "contabilidad", label: "Contabilidad", icon: "◇", roles: ["admin","gerencia","contabilidad"] },
  { id: "planilla", label: "Planilla", icon: "◈", roles: ["admin","gerencia","rrhh"] },
  { id: "dashboard", label: "Dashboard", icon: "▣", roles: ["admin","gerencia"] },
  { id: "historico", label: "Histórico", icon: "◫", roles: ["admin","gerencia"] },
]

function Sidebar({ active, onNav, usuario }) {
  const items = NAV_ITEMS.filter(i => i.roles.includes(usuario?.rol))
  return (
    <div style={{ width: 220, background: "#1a1a2e", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, padding: "0 0 20px" }}>
      <div style={{ padding: "28px 24px 20px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>TT Audit</div>
        <div style={{ fontSize: 11, color: "#ffffff55", marginTop: 2, letterSpacing: 0.5 }}>MÁRGENES</div>
      </div>
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {items.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: active === item.id ? "#ffffff15" : "transparent", border: "none", color: active === item.id ? "#fff" : "#ffffff66", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: active === item.id ? 600 : 400, marginBottom: 2, textAlign: "left", transition: "all 0.15s" }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "#ffffff08" }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent" }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
            {item.id === "aprobaciones" && <PendingBadge />}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 16px 0", borderTop: "1px solid #ffffff15" }}>
        <div style={{ fontSize: 12, color: "#ffffff66" }}>{usuario?.nombre}</div>
        <div style={{ fontSize: 11, color: "#ffffff33", marginTop: 2 }}>{ROL_LABEL[usuario?.rol]}</div>
      </div>
    </div>
  )
}

function PendingBadge() {
  return <span style={{ marginLeft: "auto", background: "#E24B4A", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>•</span>
}

// ── MÓDULO PROYECTOS ─────────────────────────────────────────
function ModuloProyectos() {
  const { usuario } = useAuth()
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFacturasModal, setShowFacturasModal] = useState(false)
  const [proyectoActivo, setProyectoActivo] = useState(null)
  const [filtros, setFiltros] = useState({ cliente: "", ejecutivo: "", estado: "", search: "" })
  const [vista, setVista] = useState("tabla")

  const canEdit = ["admin","gerencia"].includes(usuario?.rol)

  useEffect(() => { fetchProyectos() }, [])

  const fetchProyectos = async () => {
    setLoading(true)
    const { data } = await supabase.from("proyectos").select(`*, facturas_proyecto(monto, estado_cobro)`).order("created_at", { ascending: false })
    setProyectos(data || [])
    setLoading(false)
  }

  const proyectosFiltrados = proyectos.filter(p => {
    if (filtros.cliente && !p.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())) return false
    if (filtros.ejecutivo && !p.ejecutivo.toLowerCase().includes(filtros.ejecutivo.toLowerCase())) return false
    if (filtros.estado && p.estado !== filtros.estado) return false
    if (filtros.search && !p.nombre.toLowerCase().includes(filtros.search.toLowerCase())) return false
    return true
  })

  const totalFacturado = proyectosFiltrados.reduce((s, p) => s + (p.facturas_proyecto?.reduce((a, f) => a + f.monto, 0) || 0), 0)
  const totalContratado = proyectosFiltrados.reduce((s, p) => s + (p.monto_contratado || 0), 0)

  const exportCSV = () => {
    const rows = [["Nombre","Cliente","Ejecutivo","Monto Contratado","Estado","Fecha Inicio","Fecha Fin","OC"]]
    proyectosFiltrados.forEach(p => rows.push([p.nombre, p.cliente, p.ejecutivo, p.monto_contratado, p.estado, p.fecha_inicio, p.fecha_fin, p.nro_orden_compra || ""]))
    const csv = rows.map(r => r.join(",")).join("\n")
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "proyectos.csv"; a.click()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Proyectos</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>{proyectosFiltrados.length} proyectos · {fmt(totalContratado)} contratado</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
          {canEdit && <Btn onClick={() => { setProyectoActivo(null); setShowModal(true) }}>+ Nuevo proyecto</Btn>}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total proyectos", value: proyectos.length, sub: `${proyectos.filter(p=>p.estado==="activo").length} activos` },
          { label: "Monto contratado", value: fmt(totalContratado), sub: "todos los proyectos" },
          { label: "Facturado", value: fmt(totalFacturado), sub: "facturas emitidas" },
          { label: "Por facturar", value: fmt(totalContratado - totalFacturado), sub: "pendiente" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input placeholder="Buscar proyecto..." value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))} style={{ width: 200 }} />
        <Input placeholder="Cliente" value={filtros.cliente} onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))} style={{ width: 140 }} />
        <Input placeholder="Ejecutivo" value={filtros.ejecutivo} onChange={e => setFiltros(f => ({ ...f, ejecutivo: e.target.value }))} style={{ width: 140 }} />
        <Select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} style={{ width: 130 }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="cerrado">Cerrado</option>
          <option value="suspendido">Suspendido</option>
        </Select>
        {Object.values(filtros).some(Boolean) && (
          <Btn variant="secondary" onClick={() => setFiltros({ cliente: "", ejecutivo: "", estado: "", search: "" })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {["tabla","cards"].map(v => (
            <button key={v} onClick={() => setVista(v)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: vista === v ? "#1a1a2e" : "transparent", color: vista === v ? "#fff" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{v === "tabla" ? "⊞ Tabla" : "⊟ Cards"}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : vista === "tabla" ? (
        <TablaProyectos proyectos={proyectosFiltrados} canEdit={canEdit}
          onEdit={p => { setProyectoActivo(p); setShowModal(true) }}
          onFacturas={p => { setProyectoActivo(p); setShowFacturasModal(true) }}
          onRefresh={fetchProyectos}
        />
      ) : (
        <CardsProyectos proyectos={proyectosFiltrados} canEdit={canEdit}
          onEdit={p => { setProyectoActivo(p); setShowModal(true) }}
          onFacturas={p => { setProyectoActivo(p); setShowFacturasModal(true) }}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={proyectoActivo ? "Editar proyecto" : "Nuevo proyecto"}>
        <FormProyecto proyecto={proyectoActivo} onSave={() => { setShowModal(false); fetchProyectos() }} onCancel={() => setShowModal(false)} />
      </Modal>

      <Modal open={showFacturasModal} onClose={() => setShowFacturasModal(false)} title={`Facturas — ${proyectoActivo?.nombre}`}>
        <FacturasProyecto proyectoId={proyectoActivo?.id} canEdit={canEdit} />
      </Modal>
    </div>
  )
}

function TablaProyectos({ proyectos, canEdit, onEdit, onFacturas, onRefresh }) {
  return (
    <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Proyecto","Cliente","Ejecutivo","Monto contratado","OC","Período","Estado",""].map((h, i) => (
              <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proyectos.length === 0 && (
            <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No hay proyectos que coincidan con los filtros</td></tr>
          )}
          {proyectos.map((p, i) => {
            const facturado = p.facturas_proyecto?.reduce((a, f) => a + f.monto, 0) || 0
            return (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</div>
                  {facturado > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Fact: {fmt(facturado)}</div>}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{p.cliente}</td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{p.ejecutivo}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600 }}>{fmt(p.monto_contratado)}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)" }}>{p.nro_orden_compra || "—"}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {p.fecha_inicio ? p.fecha_inicio : "—"}
                  {p.fecha_fin ? ` → ${p.fecha_fin}` : ""}
                </td>
                <td style={{ padding: "14px 16px" }}><Badge estado={p.estado} /></td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onFacturas(p)}>Facturas</Btn>
                    {canEdit && <Btn variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onEdit(p)}>Editar</Btn>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CardsProyectos({ proyectos, canEdit, onEdit, onFacturas }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {proyectos.map(p => {
        const facturado = p.facturas_proyecto?.reduce((a, f) => a + f.monto, 0) || 0
        const pct = p.monto_contratado > 0 ? facturado / p.monto_contratado : 0
        return (
          <div key={p.id} style={{ background: "var(--bg)", borderRadius: 14, padding: 24, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.cliente} · {p.ejecutivo}</div>
              </div>
              <Badge estado={p.estado} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                <span>Facturado</span><span>{fmt(facturado)} / {fmt(p.monto_contratado)}</span>
              </div>
              <div style={{ height: 6, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct * 100, 100)}%`, background: "#1D9E75", borderRadius: 4, transition: "width 0.6s ease" }} />
              </div>
            </div>
            {p.nro_orden_compra && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>OC: {p.nro_orden_compra}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={() => onFacturas(p)}>Facturas</Btn>
              {canEdit && <Btn variant="secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={() => onEdit(p)}>Editar</Btn>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FormProyecto({ proyecto, onSave, onCancel }) {
  const { usuario } = useAuth()
  const [form, setForm] = useState({
    nombre: proyecto?.nombre || "",
    cliente: proyecto?.cliente || "",
    ejecutivo: proyecto?.ejecutivo || "",
    monto_contratado: proyecto?.monto_contratado || "",
    nro_orden_compra: proyecto?.nro_orden_compra || "",
    fecha_inicio: proyecto?.fecha_inicio || "",
    fecha_fin: proyecto?.fecha_fin || "",
    estado: proyecto?.estado || "activo",
    requiere_operaciones: proyecto?.requiere_operaciones || false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.nombre || !form.cliente || !form.ejecutivo || !form.monto_contratado) {
      setError("Completa los campos obligatorios"); return
    }
    setLoading(true); setError("")
    const payload = { ...form, monto_contratado: parseFloat(form.monto_contratado), creado_por: usuario.id }
    const { error } = proyecto
      ? await supabase.from("proyectos").update(payload).eq("id", proyecto.id)
      : await supabase.from("proyectos").insert(payload)
    if (error) setError(error.message)
    else onSave()
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Nombre del proyecto" required>
            <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: SS Promotores BAT - Ene 2026" />
          </Field>
        </div>
        <Field label="Cliente" required>
          <Input value={form.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Ej: BAT" />
        </Field>
        <Field label="Ejecutivo" required>
          <Select value={form.ejecutivo} onChange={e => set("ejecutivo", e.target.value)}>
            <option value="">Seleccionar</option>
            <option>CLAUDIA CAMARENA</option>
            <option>DANIELA OLAGUIBEL</option>
            <option>RAUL PULIDO</option>
          </Select>
        </Field>
        <Field label="Monto contratado (S/.)" required>
          <Input type="number" value={form.monto_contratado} onChange={e => set("monto_contratado", e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="N° Orden de compra">
          <Input value={form.nro_orden_compra} onChange={e => set("nro_orden_compra", e.target.value)} placeholder="OC-2026-001" />
        </Field>
        <Field label="Fecha inicio">
          <Input type="date" value={form.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)} />
        </Field>
        <Field label="Fecha fin">
          <Input type="date" value={form.fecha_fin} onChange={e => set("fecha_fin", e.target.value)} />
        </Field>
        <Field label="Estado">
          <Select value={form.estado} onChange={e => set("estado", e.target.value)}>
            <option value="activo">Activo</option>
            <option value="cerrado">Cerrado</option>
            <option value="suspendido">Suspendido</option>
          </Select>
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={form.requiere_operaciones} onChange={e => set("requiere_operaciones", e.target.checked)} style={{ width: 16, height: 16 }} />
            <span>Requiere participación de operaciones</span>
          </label>
        </div>
      </div>
      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar proyecto"}</Btn>
      </div>
    </div>
  )
}

function FacturasProyecto({ proyectoId, canEdit }) {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nro_factura_tt: "", fecha_factura: today(), fecha_estimada_pago: "", monto: "", estado_cobro: "pendiente" })

  useEffect(() => { if (proyectoId) fetchFacturas() }, [proyectoId])

  const fetchFacturas = async () => {
    const { data } = await supabase.from("facturas_proyecto").select("*").eq("proyecto_id", proyectoId).order("fecha_factura")
    setFacturas(data || [])
    setLoading(false)
  }

  const saveFactura = async () => {
    const { error } = await supabase.from("facturas_proyecto").insert({ ...form, monto: parseFloat(form.monto), proyecto_id: proyectoId })
    if (!error) { setShowForm(false); setForm({ nro_factura_tt: "", fecha_factura: today(), fecha_estimada_pago: "", monto: "", estado_cobro: "pendiente" }); fetchFacturas() }
  }

  const COBRO_COLOR = { pendiente: "#BA7517", cobrado: "#1D9E75", vencido: "#E24B4A" }

  return (
    <div>
      {loading ? <Spinner /> : (
        <>
          <div style={{ marginBottom: 16 }}>
            {facturas.map(f => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nro_factura_tt}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Emitida: {f.fecha_factura} · Pago est.: {f.fecha_estimada_pago || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{fmt(f.monto)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: COBRO_COLOR[f.estado_cobro] }}>{f.estado_cobro}</span>
                </div>
              </div>
            ))}
            {facturas.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 24 }}>Sin facturas registradas</div>}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Total facturado: {fmt(facturas.reduce((s, f) => s + f.monto, 0))}</div>
          </div>
          {canEdit && !showForm && (
            <Btn style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>+ Agregar factura</Btn>
          )}
          {showForm && (
            <div style={{ marginTop: 16, padding: 16, background: "var(--bg-secondary)", borderRadius: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="N° Factura TT" required>
                  <Input value={form.nro_factura_tt} onChange={e => setForm(f => ({ ...f, nro_factura_tt: e.target.value }))} placeholder="F001-00001" />
                </Field>
                <Field label="Monto (S/.)" required>
                  <Input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
                </Field>
                <Field label="Fecha de factura">
                  <Input type="date" value={form.fecha_factura} onChange={e => setForm(f => ({ ...f, fecha_factura: e.target.value }))} />
                </Field>
                <Field label="Fecha estimada de pago">
                  <Input type="date" value={form.fecha_estimada_pago} onChange={e => setForm(f => ({ ...f, fecha_estimada_pago: e.target.value }))} />
                </Field>
                <Field label="Estado de cobro">
                  <Select value={form.estado_cobro} onChange={e => setForm(f => ({ ...f, estado_cobro: e.target.value }))}>
                    <option value="pendiente">Pendiente</option>
                    <option value="cobrado">Cobrado</option>
                    <option value="vencido">Vencido</option>
                  </Select>
                </Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Btn onClick={saveFactura}>Guardar</Btn>
                <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PLACEHOLDER MÓDULOS ──────────────────────────────────────
function Placeholder({ titulo, descripcion }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{titulo}</h2>
      <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 340 }}>{descripcion}</p>
      <div style={{ marginTop: 16, padding: "8px 20px", background: "var(--bg-secondary)", borderRadius: 20, fontSize: 12, color: "var(--muted)", border: "1px solid var(--border)" }}>Próxima fase</div>
    </div>
  )
}

// ── APP SHELL ─────────────────────────────────────────────────
function AppShell({ usuario, onLogout }) {
  const [page, setPage] = useState("proyectos")

  const pages = {
    proyectos: <ModuloProyectos />,
    operaciones: <Placeholder titulo="Módulo Operaciones" descripcion="Carga de caja chica, reembolsables, movilidad y proyectados. Con flujo de aprobación viernes." />,
    aprobaciones: <Placeholder titulo="Aprobaciones" descripcion="Vista semanal de gastos pendientes con presupuesto del proyecto para validación de gerencia." />,
    contabilidad: <Placeholder titulo="Contabilidad" descripcion="Registro de gastos fijos, descarga de facturas para importar al sistema contable." />,
    planilla: <Placeholder titulo="Planilla" descripcion="Carga mensual de costos de personal por grupo y proyecto." />,
    dashboard: <Placeholder titulo="Dashboard mensual" descripcion="KPIs, márgenes por proyecto, gastos por categoría, alertas." />,
    historico: <Placeholder titulo="Histórico" descripcion="Comparativo de márgenes y gastos mes a mes." />,
  }

  return (
    <AuthContext.Provider value={{ usuario }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={page} onNav={setPage} usuario={usuario} />
        <main style={{ marginLeft: 220, flex: 1, padding: "40px 48px", background: "var(--bg-tertiary)", minHeight: "100vh" }}>
          <div style={{ maxWidth: 1100 }}>
            {pages[page]}
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  )
}

// ── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUsuario(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUsuario(session.user.id)
      else { setUsuario(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUsuario = async (id) => {
    const { data } = await supabase.from("usuarios").select("*").eq("id", id).single()
    setUsuario(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null); setUsuario(null)
  }

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  )

  if (!session) return <LoginPage onLogin={(s) => { setSession(s); fetchUsuario(s.user.id) }} />

  return <AppShell usuario={usuario} onLogout={handleLogout} />
}
