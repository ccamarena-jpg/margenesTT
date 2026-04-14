import { useState, useEffect, createContext, useContext } from "react"
import { createClient } from "@supabase/supabase-js"

// ── Supabase client ──────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

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
// ── MÓDULO OPERACIONES ────────────────────────────────────────
// Agregar este código en App.jsx antes del componente AppShell

const TIPO_GASTO_LABEL = {
  caja_chica: "Caja chica",
  reembolsable: "Reembolsable",
  movilidad: "Movilidad",
  proyectado: "Proyectado"
}

const TIPO_GASTO_COLOR = {
  caja_chica: "#534AB7",
  reembolsable: "#185FA5",
  movilidad: "#0F6E56",
  proyectado: "#BA7517"
}

const ESTADO_GASTO_LABEL = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobado_proyectado: "Aprobado — por liquidar",
  en_liquidacion: "En liquidación",
  liquidado: "Liquidado",
  rechazado: "Rechazado",
  pendiente_reaprobacion: "Pendiente re-aprobación"
}

const ESTADO_GASTO_COLOR = {
  borrador: "#888780",
  pendiente_aprobacion: "#BA7517",
  aprobado_proyectado: "#185FA5",
  en_liquidacion: "#534AB7",
  liquidado: "#1D9E75",
  rechazado: "#E24B4A",
  pendiente_reaprobacion: "#D85A30"
}

function BadgeGasto({ tipo, estado }) {
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

function ModuloOperaciones() {
  const { usuario } = useAuth()
  const [gastos, setGastos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [gastoActivo, setGastoActivo] = useState(null)
  const [showLiquidarModal, setShowLiquidarModal] = useState(false)
  const [filtros, setFiltros] = useState({ tipo: "", estado: "", proyecto: "", responsable: "", periodo: periodoActual() })

  const canAprobar = ["admin", "gerencia"].includes(usuario?.rol)
  const esOperaciones = ["operaciones", "admin", "gerencia"].includes(usuario?.rol)

  useEffect(() => {
    fetchGastos()
    fetchProyectos()
  }, [])

  const fetchGastos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("gastos")
      .select("*, proyectos(nombre, cliente, monto_contratado)")
      .order("created_at", { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  const fetchProyectos = async () => {
    const { data } = await supabase.from("proyectos").select("id, nombre, cliente, monto_contratado").eq("estado", "activo")
    setProyectos(data || [])
  }

  const gastosFiltrados = gastos.filter(g => {
    if (filtros.tipo && g.tipo !== filtros.tipo) return false
    if (filtros.estado && g.estado !== filtros.estado) return false
    if (filtros.proyecto && g.proyecto_id !== filtros.proyecto) return false
    if (filtros.responsable && !g.responsable?.toLowerCase().includes(filtros.responsable.toLowerCase())) return false
    if (filtros.periodo && g.periodo !== filtros.periodo) return false
    return true
  })

  // KPIs
  const pendientes = gastos.filter(g => g.estado === "pendiente_aprobacion").length
  const proyectados = gastos.filter(g => g.estado === "aprobado_proyectado").length
  const totalSemana = gastosFiltrados.filter(g => g.estado !== "rechazado").reduce((s, g) => s + (g.monto_real || g.monto_proyectado || 0), 0)
  const totalLiquidado = gastosFiltrados.filter(g => g.estado === "liquidado").reduce((s, g) => s + (g.monto_real || 0), 0)

  const enviarAprobacion = async (id) => {
    await supabase.from("gastos").update({ estado: "pendiente_aprobacion" }).eq("id", id)
    fetchGastos()
  }

  const exportCSV = () => {
    const rows = [["Tipo", "Responsable", "Proyecto", "Descripción", "Concepto", "Monto Proyectado", "Monto Real", "RUC Proveedor", "N° Comprobante", "Fecha", "Estado", "Período"]]
    gastosFiltrados.forEach(g => rows.push([
      TIPO_GASTO_LABEL[g.tipo], g.responsable, g.proyectos?.nombre || "",
      g.descripcion, g.concepto || "", g.monto_proyectado || "", g.monto_real || "",
      g.ruc_proveedor || "", g.nro_comprobante || "", g.fecha_gasto || "", g.estado, g.periodo || ""
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `gastos_operaciones_${filtros.periodo || "todos"}.csv`; a.click()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Operaciones</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {pendientes > 0 && <span style={{ color: "#BA7517", fontWeight: 600 }}>{pendientes} pendiente{pendientes > 1 ? "s" : ""} de aprobación · </span>}
            {proyectados > 0 && <span style={{ color: "#185FA5", fontWeight: 600 }}>{proyectados} proyectado{proyectados > 1 ? "s" : ""} por liquidar · </span>}
            {gastosFiltrados.length} registros
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
          {esOperaciones && (
            <div style={{ position: "relative" }}>
              <Btn onClick={() => setTipoSeleccionado("menu")}>+ Nuevo gasto</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Selector de tipo */}
      {tipoSeleccionado === "menu" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { tipo: "caja_chica", desc: "Con comprobante, fondo fijo" },
            { tipo: "reembolsable", desc: "Con comprobante, pago personal" },
            { tipo: "movilidad", desc: "Sin comprobante, transporte" },
            { tipo: "proyectado", desc: "Gasto futuro por ejecutar" },
          ].map(({ tipo, desc }) => (
            <div key={tipo} className="node" onClick={() => { setTipoSeleccionado(tipo); setGastoActivo(null); setShowModal(true) }}
              style={{ background: "var(--bg)", border: `2px solid ${TIPO_GASTO_COLOR[tipo]}44`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = TIPO_GASTO_COLOR[tipo]}
              onMouseLeave={e => e.currentTarget.style.borderColor = TIPO_GASTO_COLOR[tipo] + "44"}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: TIPO_GASTO_COLOR[tipo], marginBottom: 4 }}>{TIPO_GASTO_LABEL[tipo]}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pend. aprobación", value: pendientes, color: "#BA7517" },
          { label: "Proyectados activos", value: proyectados, color: "#185FA5" },
          { label: "Total período", value: fmt(totalSemana), color: "var(--text)" },
          { label: "Total liquidado", value: fmt(totalLiquidado), color: "#1D9E75" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={{ width: 160 }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_GASTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_GASTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filtros.proyecto} onChange={e => setFiltros(f => ({ ...f, proyecto: e.target.value }))} style={{ width: 200 }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
        <Select value={filtros.responsable} onChange={e => setFiltros(f => ({ ...f, responsable: e.target.value }))} style={{ width: 140 }}>
          <option value="">Todos</option>
          <option value="Roxana">Roxana</option>
          <option value="Edinson">Edinson</option>
        </Select>
        <Input type="month" value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))} style={{ width: 150 }} />
        {Object.values(filtros).some(Boolean) && (
          <Btn variant="secondary" onClick={() => setFiltros({ tipo: "", estado: "", proyecto: "", responsable: "", periodo: periodoActual() })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Tipo", "Responsable", "Proyecto", "Descripción", "Monto", "Comprobante", "Fecha", "Estado", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No hay gastos registrados</td></tr>
              )}
              {gastosFiltrados.map((g, i) => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                  <td style={{ padding: "12px 14px" }}><BadgeGasto tipo={g.tipo} /></td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{g.responsable}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{g.proyectos?.nombre || "—"}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{g.proyectos?.cliente}</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    <div>{g.descripcion}</div>
                    {g.concepto && <div style={{ color: "var(--muted)", fontSize: 11 }}>{g.concepto}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {g.monto_real ? fmt(g.monto_real) : g.monto_proyectado ? <span style={{ color: "var(--muted)" }}>~{fmt(g.monto_proyectado)}</span> : "—"}
                    {g.monto_proyectado && g.monto_real && Math.abs(g.monto_real - g.monto_proyectado) > 0.01 && (
                      <div style={{ fontSize: 10, color: "#E24B4A" }}>Proy: {fmt(g.monto_proyectado)}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>
                    {g.tipo !== "movilidad" && g.tipo !== "proyectado" ? (
                      <div>
                        {g.tipo_comprobante && <div style={{ fontWeight: 600, textTransform: "uppercase" }}>{g.tipo_comprobante}</div>}
                        {g.nro_comprobante && <div>{g.nro_serie ? `${g.nro_serie}-` : ""}{g.nro_comprobante}</div>}
                        {g.ruc_proveedor && <div>{g.ruc_proveedor}</div>}
                      </div>
                    ) : g.tipo === "movilidad" ? (
                      <div>
                        <div>{g.motivo_movilidad || "—"}</div>
                        {g.destino && <div>{g.destino}</div>}
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{g.fecha_gasto || "—"}</td>
                  <td style={{ padding: "12px 14px" }}><BadgeGasto estado={g.estado} /></td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                      {g.estado === "borrador" && esOperaciones && (
                        <>
                          <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setGastoActivo(g); setTipoSeleccionado(g.tipo); setShowModal(true) }}>Editar</Btn>
                          <Btn variant="success" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => enviarAprobacion(g.id)}>Enviar</Btn>
                        </>
                      )}
                      {g.estado === "aprobado_proyectado" && esOperaciones && (
                        <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setGastoActivo(g); setShowLiquidarModal(true) }}>Liquidar</Btn>
                      )}
                      {g.estado === "pendiente_reaprobacion" && esOperaciones && (
                        <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setGastoActivo(g); setShowLiquidarModal(true) }}>Ver</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo/editar gasto */}
      <Modal open={showModal && tipoSeleccionado !== "menu"} onClose={() => { setShowModal(false); setTipoSeleccionado(null) }}
        title={gastoActivo ? `Editar — ${TIPO_GASTO_LABEL[tipoSeleccionado]}` : `Nuevo gasto — ${TIPO_GASTO_LABEL[tipoSeleccionado]}`}>
        <FormGasto tipo={tipoSeleccionado} gasto={gastoActivo} proyectos={proyectos}
          onSave={() => { setShowModal(false); setTipoSeleccionado(null); fetchGastos() }}
          onCancel={() => { setShowModal(false); setTipoSeleccionado(null) }} />
      </Modal>

      {/* Modal liquidar proyectado */}
      <Modal open={showLiquidarModal} onClose={() => setShowLiquidarModal(false)} title="Liquidar proyectado">
        <FormLiquidar gasto={gastoActivo}
          onSave={() => { setShowLiquidarModal(false); fetchGastos() }}
          onCancel={() => setShowLiquidarModal(false)} />
      </Modal>
    </div>
  )
}

function FormGasto({ tipo, gasto, proyectos, onSave, onCancel }) {
  const { usuario } = useAuth()
  const [form, setForm] = useState({
    proyecto_id: gasto?.proyecto_id || "",
    descripcion: gasto?.descripcion || "",
    concepto: gasto?.concepto || "",
    responsable: gasto?.responsable || "",
    monto_proyectado: gasto?.monto_proyectado || "",
    monto_real: gasto?.monto_real || "",
    fecha_gasto: gasto?.fecha_gasto || today(),
    tipo_comprobante: gasto?.tipo_comprobante || "factura",
    nro_serie: gasto?.nro_serie || "",
    nro_comprobante: gasto?.nro_comprobante || "",
    ruc_proveedor: gasto?.ruc_proveedor || "",
    razon_social_proveedor: gasto?.razon_social_proveedor || "",
    base_imponible: gasto?.base_imponible || "",
    igv: gasto?.igv || "",
    monto_exonerado: gasto?.monto_exonerado || "",
    motivo_movilidad: gasto?.motivo_movilidad || "",
    destino: gasto?.destino || "",
    scope_asignacion: gasto?.scope_asignacion || "proyecto",
    periodo: gasto?.periodo || periodoActual(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto calcular IGV
  const handleBaseImponible = (v) => {
    set("base_imponible", v)
    if (v && form.tipo_comprobante !== "rxh") set("igv", (parseFloat(v) * 0.18).toFixed(2))
  }

  const handleSave = async () => {
    if (!form.descripcion || !form.responsable) { setError("Descripción y responsable son obligatorios"); return }
    if (tipo !== "movilidad" && tipo !== "proyectado" && !form.nro_comprobante) { setError("Número de comprobante requerido"); return }
    if ((tipo === "caja_chica" || tipo === "reembolsable") && !form.monto_real && !form.base_imponible) { setError("Ingresa el monto"); return }
    if (tipo === "movilidad" && !form.monto_real) { setError("Ingresa el monto"); return }
    if (tipo === "proyectado" && !form.monto_proyectado) { setError("Ingresa el monto proyectado"); return }

    setLoading(true); setError("")

    // Calcular monto_real para caja chica y reembolsable
    let monto_real = form.monto_real ? parseFloat(form.monto_real) : null
    if (!monto_real && form.base_imponible) {
      monto_real = parseFloat(form.base_imponible) + parseFloat(form.igv || 0) + parseFloat(form.monto_exonerado || 0)
    }

    const payload = {
      ...form,
      tipo,
      monto_proyectado: form.monto_proyectado ? parseFloat(form.monto_proyectado) : null,
      monto_real,
      base_imponible: form.base_imponible ? parseFloat(form.base_imponible) : null,
      igv: form.igv ? parseFloat(form.igv) : null,
      monto_exonerado: form.monto_exonerado ? parseFloat(form.monto_exonerado) : null,
      cargado_por: usuario.id,
      estado: "borrador",
    }

    const { error } = gasto
      ? await supabase.from("gastos").update(payload).eq("id", gasto.id)
      : await supabase.from("gastos").insert(payload)

    if (error) setError(error.message)
    else onSave()
    setLoading(false)
  }

  const tieneComprobante = tipo === "caja_chica" || tipo === "reembolsable"

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Responsable y proyecto — siempre */}
        <Field label="Responsable" required>
          <Select value={form.responsable} onChange={e => set("responsable", e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="Roxana">Roxana Hidalgo</option>
            <option value="Edinson">Edinson (Gerente Operaciones)</option>
          </Select>
        </Field>
        <Field label="Período">
          <Input type="month" value={form.periodo} onChange={e => set("periodo", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Proyecto asociado">
            <Select value={form.proyecto_id} onChange={e => set("proyecto_id", e.target.value)}>
              <option value="">Sin proyecto específico</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente} ({fmt(p.monto_contratado)})</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Scope de asignación">
          <Select value={form.scope_asignacion} onChange={e => set("scope_asignacion", e.target.value)}>
            <option value="proyecto">Proyecto específico</option>
            <option value="operaciones">Todos los proyectos con operaciones</option>
            <option value="todos">Todos los proyectos</option>
          </Select>
        </Field>
        <Field label="Fecha del gasto">
          <Input type="date" value={form.fecha_gasto} onChange={e => set("fecha_gasto", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Descripción" required>
            <Input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Descripción del gasto" />
          </Field>
        </div>

        {/* Campos movilidad */}
        {tipo === "movilidad" && (
          <>
            <Field label="Motivo">
              <Input value={form.motivo_movilidad} onChange={e => set("motivo_movilidad", e.target.value)} placeholder="Visita a cliente, entrega, etc." />
            </Field>
            <Field label="Destino">
              <Input value={form.destino} onChange={e => set("destino", e.target.value)} placeholder="Dirección o zona" />
            </Field>
            <Field label="Monto (S/.)" required>
              <Input type="number" value={form.monto_real} onChange={e => set("monto_real", e.target.value)} placeholder="0.00" />
            </Field>
          </>
        )}

        {/* Campos proyectado */}
        {tipo === "proyectado" && (
          <>
            <Field label="Concepto">
              <Input value={form.concepto} onChange={e => set("concepto", e.target.value)} placeholder="Detalle del gasto proyectado" />
            </Field>
            <Field label="Monto proyectado (S/.)" required>
              <Input type="number" value={form.monto_proyectado} onChange={e => set("monto_proyectado", e.target.value)} placeholder="0.00" />
            </Field>
          </>
        )}

        {/* Campos con comprobante */}
        {tieneComprobante && (
          <>
            <Field label="Tipo de comprobante">
              <Select value={form.tipo_comprobante} onChange={e => { set("tipo_comprobante", e.target.value); if (e.target.value === "rxh") set("igv", "") }}>
                <option value="factura">Factura</option>
                <option value="boleta">Boleta</option>
                <option value="rxh">RxH (Honorarios)</option>
                <option value="ticket">Ticket</option>
              </Select>
            </Field>
            <Field label="Concepto">
              <Input value={form.concepto} onChange={e => set("concepto", e.target.value)} placeholder="Concepto del comprobante" />
            </Field>
            <Field label="Serie">
              <Input value={form.nro_serie} onChange={e => set("nro_serie", e.target.value)} placeholder="F001, B001..." />
            </Field>
            <Field label="N° Comprobante" required>
              <Input value={form.nro_comprobante} onChange={e => set("nro_comprobante", e.target.value)} placeholder="00001234" />
            </Field>
            <Field label="RUC Proveedor">
              <Input value={form.ruc_proveedor} onChange={e => set("ruc_proveedor", e.target.value)} placeholder="20123456789" maxLength={11} />
            </Field>
            <Field label="Razón social proveedor">
              <Input value={form.razon_social_proveedor} onChange={e => set("razon_social_proveedor", e.target.value)} placeholder="Nombre del proveedor" />
            </Field>
            <Field label="Base imponible (S/.)">
              <Input type="number" value={form.base_imponible} onChange={e => handleBaseImponible(e.target.value)} placeholder="0.00" />
            </Field>
            {form.tipo_comprobante !== "rxh" && (
              <Field label="IGV (18%)">
                <Input type="number" value={form.igv} onChange={e => set("igv", e.target.value)} placeholder="0.00" />
              </Field>
            )}
            <Field label="Monto exonerado">
              <Input type="number" value={form.monto_exonerado} onChange={e => set("monto_exonerado", e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Total (S/.)">
              <Input readOnly value={
                form.base_imponible
                  ? (parseFloat(form.base_imponible || 0) + parseFloat(form.igv || 0) + parseFloat(form.monto_exonerado || 0)).toFixed(2)
                  : ""
              } style={{ background: "var(--bg-tertiary)", fontWeight: 700 }} />
            </Field>
          </>
        )}
      </div>

      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="secondary" onClick={async () => {
          const payload = { ...form, tipo, cargado_por: usuario.id, estado: "borrador",
            monto_proyectado: form.monto_proyectado ? parseFloat(form.monto_proyectado) : null,
            monto_real: form.monto_real ? parseFloat(form.monto_real) : null,
            base_imponible: form.base_imponible ? parseFloat(form.base_imponible) : null,
            igv: form.igv ? parseFloat(form.igv) : null }
          gasto ? await supabase.from("gastos").update(payload).eq("id", gasto.id)
                : await supabase.from("gastos").insert(payload)
          onSave()
        }}>Guardar borrador</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar y enviar"}</Btn>
      </div>
    </div>
  )
}

function FormLiquidar({ gasto, onSave, onCancel }) {
  const [form, setForm] = useState({
    tipo_comprobante: "factura",
    nro_serie: "",
    nro_comprobante: "",
    ruc_proveedor: gasto?.ruc_proveedor || "",
    razon_social_proveedor: gasto?.razon_social_proveedor || "",
    base_imponible: "",
    igv: "",
    monto_exonerado: "",
    monto_real: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const montoReal = parseFloat(form.monto_real || 0) ||
    (parseFloat(form.base_imponible || 0) + parseFloat(form.igv || 0) + parseFloat(form.monto_exonerado || 0))

  const montoDiferente = gasto?.monto_proyectado && Math.abs(montoReal - gasto.monto_proyectado) > 0.01

  const handleLiquidar = async () => {
    if (!form.nro_comprobante) { setError("Número de comprobante requerido"); return }
    if (!montoReal) { setError("Ingresa el monto real"); return }
    setLoading(true); setError("")
    const nuevoEstado = montoDiferente ? "pendiente_reaprobacion" : "liquidado"
    const { error } = await supabase.from("gastos").update({
      ...form,
      monto_real: montoReal,
      base_imponible: form.base_imponible ? parseFloat(form.base_imponible) : null,
      igv: form.igv ? parseFloat(form.igv) : null,
      monto_exonerado: form.monto_exonerado ? parseFloat(form.monto_exonerado) : null,
      estado: nuevoEstado,
      tipo: gasto.tipo === "proyectado" ? "proyectado" : gasto.tipo,
    }).eq("id", gasto.id)
    if (error) setError(error.message)
    else onSave()
    setLoading(false)
  }

  return (
    <div>
      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Proyectado aprobado</div>
        <div style={{ fontSize: 14 }}>{gasto?.descripcion}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Monto aprobado: <strong>{fmt(gasto?.monto_proyectado)}</strong></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de comprobante">
          <Select value={form.tipo_comprobante} onChange={e => set("tipo_comprobante", e.target.value)}>
            <option value="factura">Factura</option>
            <option value="boleta">Boleta</option>
            <option value="rxh">RxH</option>
            <option value="ticket">Ticket</option>
          </Select>
        </Field>
        <Field label="Serie">
          <Input value={form.nro_serie} onChange={e => set("nro_serie", e.target.value)} placeholder="F001" />
        </Field>
        <Field label="N° Comprobante" required>
          <Input value={form.nro_comprobante} onChange={e => set("nro_comprobante", e.target.value)} placeholder="00001234" />
        </Field>
        <Field label="RUC Proveedor">
          <Input value={form.ruc_proveedor} onChange={e => set("ruc_proveedor", e.target.value)} placeholder="20123456789" />
        </Field>
        <Field label="Base imponible">
          <Input type="number" value={form.base_imponible} onChange={e => { set("base_imponible", e.target.value); set("igv", (parseFloat(e.target.value || 0) * 0.18).toFixed(2)) }} />
        </Field>
        <Field label="IGV">
          <Input type="number" value={form.igv} onChange={e => set("igv", e.target.value)} />
        </Field>
        <Field label="Monto total real (S/.)">
          <Input type="number" value={form.monto_real} onChange={e => set("monto_real", e.target.value)}
            placeholder={form.base_imponible ? (parseFloat(form.base_imponible) + parseFloat(form.igv || 0)).toFixed(2) : "0.00"} />
        </Field>
      </div>
      {montoReal > 0 && montoDiferente && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#E24B4A11", border: "1px solid #E24B4A44", borderRadius: 8, fontSize: 13, color: "#E24B4A" }}>
          ⚠ El monto real ({fmt(montoReal)}) difiere del proyectado ({fmt(gasto?.monto_proyectado)}). Requerirá re-aprobación de gerencia.
        </div>
      )}
      {montoReal > 0 && !montoDiferente && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#1D9E7511", border: "1px solid #1D9E7544", borderRadius: 8, fontSize: 13, color: "#1D9E75" }}>
          ✓ Monto coincide con el proyectado. Se liquidará directamente.
        </div>
      )}
      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleLiquidar} disabled={loading}>{loading ? "Guardando..." : "Liquidar"}</Btn>
      </div>
    </div>
  )
}

// ── MÓDULO APROBACIONES ───────────────────────────────────────
function ModuloAprobaciones() {
  const { usuario } = useAuth()
  const [gastos, setGastos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [showRechazoModal, setShowRechazoModal] = useState(false)
  const [gastoRechazo, setGastoRechazo] = useState(null)

  useEffect(() => { fetchPendientes(); fetchProyectos() }, [])

  const fetchPendientes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("gastos")
      .select("*, proyectos(nombre, cliente, monto_contratado, ejecutivo)")
      .in("estado", ["pendiente_aprobacion", "pendiente_reaprobacion"])
      .order("created_at", { ascending: true })
    setGastos(data || [])
    setLoading(false)
  }

  const fetchProyectos = async () => {
    const { data } = await supabase.from("proyectos").select("id, nombre, monto_contratado")
    setProyectos(data || [])
  }

  const aprobar = async (gasto) => {
    const nuevoEstado = gasto.tipo === "proyectado" && !gasto.monto_real
      ? "aprobado_proyectado"
      : "liquidado"
    await supabase.from("gastos").update({
      estado: nuevoEstado,
      aprobado_por: usuario.id,
      fecha_aprobacion: new Date().toISOString()
    }).eq("id", gasto.id)
    fetchPendientes()
  }

  const rechazar = async () => {
    await supabase.from("gastos").update({
      estado: "rechazado",
      motivo_rechazo: motivoRechazo,
      aprobado_por: usuario.id,
    }).eq("id", gastoRechazo.id)
    setShowRechazoModal(false)
    setMotivoRechazo("")
    fetchPendientes()
  }

  const exportCSV = () => {
    const rows = [["Tipo","Responsable","Proyecto","Cliente","Monto Contratado","Descripción","Monto","Comprobante","RUC","Estado"]]
    gastos.forEach(g => rows.push([
      TIPO_GASTO_LABEL[g.tipo], g.responsable, g.proyectos?.nombre || "", g.proyectos?.cliente || "",
      g.proyectos?.monto_contratado || "", g.descripcion,
      g.monto_real || g.monto_proyectado || "", g.nro_comprobante || "", g.ruc_proveedor || "", g.estado
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `aprobaciones_viernes_${today()}.csv`; a.click()
  }

  const totalPendiente = gastos.reduce((s, g) => s + (g.monto_real || g.monto_proyectado || 0), 0)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Aprobaciones</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {gastos.length} gasto{gastos.length !== 1 ? "s" : ""} pendiente{gastos.length !== 1 ? "s" : ""} · Total: <strong>{fmt(totalPendiente)}</strong>
          </p>
        </div>
        <Btn variant="secondary" onClick={exportCSV}>↓ Exportar viernes</Btn>
      </div>

      {loading ? <Spinner /> : gastos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✓</div>
          <h3 style={{ margin: 0 }}>Sin pendientes</h3>
          <p style={{ color: "var(--muted)" }}>No hay gastos esperando aprobación</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gastos.map(g => {
            const presupuesto = g.proyectos?.monto_contratado || 0
            const monto = g.monto_real || g.monto_proyectado || 0
            const pctPresupuesto = presupuesto > 0 ? (monto / presupuesto * 100).toFixed(1) : null
            return (
              <div key={g.id} style={{ background: "var(--bg)", borderRadius: 14, padding: 24, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <BadgeGasto tipo={g.tipo} />
                    <BadgeGasto estado={g.estado} />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>por {g.responsable}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(monto)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Descripción</div>
                    <div style={{ fontSize: 14 }}>{g.descripcion}</div>
                    {g.concepto && <div style={{ fontSize: 12, color: "var(--muted)" }}>{g.concepto}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Proyecto</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{g.proyectos?.nombre || "Sin proyecto"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{g.proyectos?.cliente}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Presupuesto proyecto</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(presupuesto)}</div>
                    {pctPresupuesto && <div style={{ fontSize: 12, color: parseFloat(pctPresupuesto) > 10 ? "#E24B4A" : "var(--muted)" }}>Este gasto = {pctPresupuesto}% del contrato</div>}
                  </div>
                </div>
                {g.tipo !== "movilidad" && g.tipo !== "proyectado" && (
                  <div style={{ display: "flex", gap: 20, marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
                    {g.tipo_comprobante && <span><strong>Doc:</strong> {g.tipo_comprobante?.toUpperCase()} {g.nro_serie}-{g.nro_comprobante}</span>}
                    {g.ruc_proveedor && <span><strong>RUC:</strong> {g.ruc_proveedor} — {g.razon_social_proveedor}</span>}
                    {g.base_imponible && <span><strong>Base:</strong> {fmt(g.base_imponible)} + IGV {fmt(g.igv)}</span>}
                  </div>
                )}
                {g.tipo === "movilidad" && (
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                    <strong>Motivo:</strong> {g.motivo_movilidad} · <strong>Destino:</strong> {g.destino}
                  </div>
                )}
                {g.estado === "pendiente_reaprobacion" && g.monto_proyectado && (
                  <div style={{ marginBottom: 16, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8, fontSize: 13, color: "#E24B4A" }}>
                    ⚠ Monto real ({fmt(g.monto_real)}) difiere del proyectado aprobado ({fmt(g.monto_proyectado)})
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="danger" onClick={() => { setGastoRechazo(g); setShowRechazoModal(true) }}>Rechazar</Btn>
                  <Btn variant="success" onClick={() => aprobar(g)}>
                    {g.tipo === "proyectado" && !g.monto_real ? "Aprobar y liberar pago" : "Aprobar"}
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showRechazoModal} onClose={() => setShowRechazoModal(false)} title="Motivo de rechazo">
        <Field label="Motivo">
          <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14, minHeight: 100, boxSizing: "border-box", resize: "vertical" }}
            placeholder="Explica por qué se rechaza este gasto..." />
        </Field>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="secondary" onClick={() => setShowRechazoModal(false)}>Cancelar</Btn>
          <Btn variant="danger" onClick={rechazar}>Confirmar rechazo</Btn>
        </div>
      </Modal>
    </div>
  )
}
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
    operaciones: <ModuloOperaciones />,
    aprobaciones: <ModuloAprobaciones />,
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