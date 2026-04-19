import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, periodoActual } from "../lib/utils"
import { Spinner, Modal, Field, Input, Select, Btn } from "../components/ui"

// ── Constantes ────────────────────────────────────────────────
const CHOFERES = [
  { nombre: "Chris",   vehiculo: "Auto" },
  { nombre: "Vicente", vehiculo: "Camión" },
]
const CHOFER_COLOR  = { Chris: "#185FA5", Vicente: "#BA7517" }
const ESTADO_COLOR  = { programado: "#BA7517", completado: "#1D9E75", cancelado: "#E24B4A" }
const ESTADO_LABEL  = { programado: "Programado", completado: "Completado", cancelado: "Cancelado" }
const DIAS_SEMANA   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const nextPeriod = (p) => {
  const [y, m] = p.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

// ── Módulo principal ──────────────────────────────────────────
export default function ModuloFlota() {
  const { usuario } = useAuth()
  const [tab, setTab]           = useState("rutas")
  const [rutas, setRutas]       = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [periodo, setPeriodo]   = useState(periodoActual())
  const [showModal, setShowModal] = useState(false)
  const [rutaActiva, setRutaActiva] = useState(null)

  const canEdit = ["admin", "gerencia", "operaciones"].includes(usuario?.rol)

  useEffect(() => { fetchAll() }, [periodo])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("rutas")
        .select("*, proyectos(nombre, cliente)")
        .gte("fecha", `${periodo}-01`)
        .lt("fecha", `${nextPeriod(periodo)}-01`)
        .order("fecha", { ascending: true }),
      supabase.from("proyectos").select("id, nombre, cliente").eq("estado", "activo"),
    ])
    setRutas(r || [])
    setProyectos(p || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta ruta?")) return
    await supabase.from("rutas").delete().eq("id", id)
    fetchAll()
  }

  const TABS = [
    { id: "rutas",      label: "Rutas" },
    { id: "calendario", label: "Calendario" },
    { id: "resumen",    label: "Resumen Móviles" },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Operaciones</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            Gestión de flota y rutas · {rutas.length} ruta{rutas.length !== 1 ? "s" : ""} en el período
          </p>
        </div>
        {canEdit && tab === "rutas" && (
          <Btn onClick={() => { setRutaActiva(null); setShowModal(true) }}>+ Nueva ruta</Btn>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "var(--text)" : "var(--muted)", borderBottom: tab === t.id ? "2px solid #1a1a2e" : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === "rutas" && (
            <TabRutas rutas={rutas} proyectos={proyectos} periodo={periodo}
              onPeriodo={setPeriodo} canEdit={canEdit}
              onEditar={r => { setRutaActiva(r); setShowModal(true) }}
              onEliminar={handleDelete} />
          )}
          {tab === "calendario" && (
            <TabCalendario rutas={rutas} periodo={periodo} onPeriodo={setPeriodo} proyectos={proyectos} />
          )}
          {tab === "resumen" && (
            <TabResumen rutas={rutas} proyectos={proyectos} periodo={periodo} onPeriodo={setPeriodo} />
          )}
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={rutaActiva ? "Editar ruta" : "Nueva ruta"}>
        <FormRuta ruta={rutaActiva} proyectos={proyectos}
          onSave={() => { setShowModal(false); fetchAll() }}
          onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}

// ── Tab Rutas ─────────────────────────────────────────────────
function TabRutas({ rutas, proyectos, periodo, onPeriodo, canEdit, onEditar, onEliminar }) {
  const [filtroChofer, setFiltroChofer] = useState("")

  const filtradas = rutas.filter(r => !filtroChofer || r.chofer === filtroChofer)

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input type="month" value={periodo} onChange={e => onPeriodo(e.target.value)} style={{ width: 160 }} />
        <Select value={filtroChofer} onChange={e => setFiltroChofer(e.target.value)} style={{ width: 160 }}>
          <option value="">Todos los choferes</option>
          {CHOFERES.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre} — {c.vehiculo}</option>)}
        </Select>
        {filtroChofer && (
          <Btn variant="secondary" onClick={() => setFiltroChofer("")} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total rutas",       value: rutas.length },
          { label: "Completadas",       value: rutas.filter(r => r.estado === "completado").length, color: "#1D9E75" },
          { label: "Programadas",       value: rutas.filter(r => r.estado === "programado").length, color: "#BA7517" },
          { label: "KM totales",        value: `${rutas.reduce((s,r) => s + (r.km_recorridos||0), 0).toFixed(0)} km` },
        ].map((k,i) => (
          <div key={i} style={{ background: "var(--bg)", borderRadius: 12, padding: "16px 20px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color || "var(--text)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Fecha","Chofer","Vehículo","Proyecto","Origen","Destino","Propósito","KM","Estado",""].map((h,i) => (
                <th key={i} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Sin rutas en el período</td></tr>
            )}
            {filtradas.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{r.fecha}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: CHOFER_COLOR[r.chofer] + "22", color: CHOFER_COLOR[r.chofer] }}>{r.chofer}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>{r.vehiculo}</td>
                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{r.proyectos?.nombre || "—"}</div>
                  {r.proyectos?.cliente && <div style={{ color: "var(--muted)", fontSize: 11 }}>{r.proyectos.cliente}</div>}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>{r.origen || "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.destino}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>{r.proposito || "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right" }}>{r.km_recorridos ? `${r.km_recorridos} km` : "—"}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ESTADO_COLOR[r.estado] + "22", color: ESTADO_COLOR[r.estado] }}>
                    {ESTADO_LABEL[r.estado] || r.estado}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onEditar(r)}>Editar</Btn>
                      <Btn variant="danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onEliminar(r.id)}>✕</Btn>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab Calendario ────────────────────────────────────────────
function TabCalendario({ rutas, periodo, onPeriodo, proyectos }) {
  const [year, month] = periodo.split("-").map(Number)
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const offset = firstDow === 0 ? 6 : firstDow - 1 // Mon-based

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const rutasPorDia = {}
  rutas.forEach(r => {
    const d = parseInt(r.fecha?.split("-")[2])
    if (!rutasPorDia[d]) rutasPorDia[d] = []
    rutasPorDia[d].push(r)
  })

  const hoy = new Date()
  const esHoy = (d) => d && hoy.getFullYear() === year && hoy.getMonth() + 1 === month && hoy.getDate() === d

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <Input type="month" value={periodo} onChange={e => onPeriodo(e.target.value)} style={{ width: 160 }} />
        <div style={{ display: "flex", gap: 16 }}>
          {CHOFERES.map(c => (
            <div key={c.nombre} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: CHOFER_COLOR[c.nombre] }} />
              {c.nombre} — {c.vehiculo}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", padding: 16 }}>
        {/* Header días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((day, i) => (
            <div key={i} style={{
              minHeight: 90, borderRadius: 8, padding: 6,
              background: day ? (esHoy(day) ? "#1a1a2e08" : "var(--bg-secondary)") : "transparent",
              border: day ? (esHoy(day) ? "2px solid #1a1a2e" : "1px solid var(--border-light)") : "none",
            }}>
              {day && (
                <>
                  <div style={{ fontSize: 12, fontWeight: esHoy(day) ? 800 : 500, color: esHoy(day) ? "#1a1a2e" : "var(--muted)", marginBottom: 4 }}>{day}</div>
                  {(rutasPorDia[day] || []).map((r, ri) => (
                    <div key={ri} title={`${r.chofer}: ${r.origen || ""} → ${r.destino}`}
                      style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: CHOFER_COLOR[r.chofer] + "25", color: CHOFER_COLOR[r.chofer], marginBottom: 2, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.chofer}: {r.destino}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab Resumen ───────────────────────────────────────────────
function TabResumen({ rutas, proyectos, periodo, onPeriodo }) {
  const statsVehiculo = CHOFERES.map(c => {
    const mis = rutas.filter(r => r.chofer === c.nombre)
    const totalKm = mis.reduce((s, r) => s + (r.km_recorridos || 0), 0)
    const completadas = mis.filter(r => r.estado === "completado").length

    // Desglose por proyecto
    const porProyecto = {}
    mis.forEach(r => {
      const key = r.proyecto_id || "__sin__"
      const nombre = r.proyectos?.nombre || "Sin proyecto"
      if (!porProyecto[key]) porProyecto[key] = { nombre, count: 0 }
      porProyecto[key].count++
    })

    return { ...c, total: mis.length, totalKm, completadas, porProyecto }
  })

  const totalGeneral = rutas.length

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <Input type="month" value={periodo} onChange={e => onPeriodo(e.target.value)} style={{ width: 160 }} />
      </div>

      {/* Tabla resumen por vehículo */}
      <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Uso por unidad móvil
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Chofer","Vehículo","Total rutas","% Uso","KM totales","Completadas","Desglose por proyecto"].map((h,i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: i >= 2 ? "right" : "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statsVehiculo.map((s, i) => (
              <tr key={s.nombre} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: CHOFER_COLOR[s.nombre] + "22", color: CHOFER_COLOR[s.nombre] }}>{s.nombre}</span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted)" }}>{s.vehiculo}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontWeight: 700 }}>{s.total}</td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ width: 60, height: 8, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${totalGeneral > 0 ? (s.total / totalGeneral * 100).toFixed(0) : 0}%`, height: "100%", background: CHOFER_COLOR[s.nombre], borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {totalGeneral > 0 ? (s.total / totalGeneral * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>{s.totalKm.toFixed(0)} km</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, color: "#1D9E75", fontWeight: 600 }}>{s.completadas}</td>
                <td style={{ padding: "14px 16px", fontSize: 12 }}>
                  {Object.values(s.porProyecto).map((pp, pi) => (
                    <span key={pi} style={{ display: "inline-block", marginRight: 6, marginBottom: 2, padding: "2px 8px", borderRadius: 20, background: "var(--bg-tertiary)", fontSize: 11, color: "var(--muted)" }}>
                      {pp.nombre} ({pp.count})
                    </span>
                  ))}
                  {Object.keys(s.porProyecto).length === 0 && <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {totalGeneral > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                <td colSpan={2} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800 }}>{totalGeneral}</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>100%</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{rutas.reduce((s,r) => s + (r.km_recorridos||0), 0).toFixed(0)} km</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#1D9E75" }}>{rutas.filter(r => r.estado === "completado").length}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detalle de movimientos */}
      <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Detalle de movimientos
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Fecha","Chofer","Proyecto","Destino","Propósito","KM","Estado"].map((h,i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rutas.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Sin movimientos en el período</td></tr>
            )}
            {rutas.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>{r.fecha}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: CHOFER_COLOR[r.chofer] + "22", color: CHOFER_COLOR[r.chofer] }}>{r.chofer}</span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12 }}>{r.proyectos?.nombre || "—"}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{r.destino}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--muted)" }}>{r.proposito || "—"}</td>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>{r.km_recorridos ? `${r.km_recorridos} km` : "—"}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ESTADO_COLOR[r.estado] + "22", color: ESTADO_COLOR[r.estado] }}>
                    {ESTADO_LABEL[r.estado] || r.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Formulario de ruta ────────────────────────────────────────
function FormRuta({ ruta, proyectos, onSave, onCancel }) {
  const { usuario } = useAuth()
  const choferInicial = ruta?.chofer || CHOFERES[0].nombre
  const vehiculoInicial = CHOFERES.find(c => c.nombre === choferInicial)?.vehiculo || CHOFERES[0].vehiculo

  const [form, setForm] = useState({
    chofer:        choferInicial,
    vehiculo:      vehiculoInicial,
    proyecto_id:   ruta?.proyecto_id || "",
    fecha:         ruta?.fecha || today(),
    hora_salida:   ruta?.hora_salida || "",
    hora_llegada:  ruta?.hora_llegada || "",
    origen:        ruta?.origen || "",
    destino:       ruta?.destino || "",
    proposito:     ruta?.proposito || "",
    km_recorridos: ruta?.km_recorridos || "",
    observaciones: ruta?.observaciones || "",
    estado:        ruta?.estado || "programado",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleChofer = (nombre) => {
    const veh = CHOFERES.find(c => c.nombre === nombre)?.vehiculo || ""
    setForm(f => ({ ...f, chofer: nombre, vehiculo: veh }))
  }

  const handleSave = async () => {
    if (!form.destino) { setError("El destino es obligatorio"); return }
    setLoading(true); setError("")

    const payload = {
      ...form,
      km_recorridos: form.km_recorridos ? parseFloat(form.km_recorridos) : null,
      proyecto_id: form.proyecto_id || null,
      hora_salida: form.hora_salida || null,
      hora_llegada: form.hora_llegada || null,
      creado_por: usuario.id,
    }

    const { error: err } = ruta
      ? await supabase.from("rutas").update(payload).eq("id", ruta.id)
      : await supabase.from("rutas").insert(payload)

    if (err) setError(err.message)
    else onSave()
    setLoading(false)
  }

  return (
    <div style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Chofer" required>
          <Select value={form.chofer} onChange={e => handleChofer(e.target.value)}>
            {CHOFERES.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre} — {c.vehiculo}</option>)}
          </Select>
        </Field>
        <Field label="Vehículo">
          <Input value={form.vehiculo} readOnly style={{ background: "var(--bg-tertiary)" }} />
        </Field>

        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Proyecto asociado">
            <Select value={form.proyecto_id} onChange={e => set("proyecto_id", e.target.value)}>
              <option value="">Sin proyecto específico</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Fecha" required>
          <Input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
        </Field>
        <Field label="Estado">
          <Select value={form.estado} onChange={e => set("estado", e.target.value)}>
            <option value="programado">Programado</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </Field>

        <Field label="Hora salida">
          <Input type="time" value={form.hora_salida} onChange={e => set("hora_salida", e.target.value)} />
        </Field>
        <Field label="Hora llegada">
          <Input type="time" value={form.hora_llegada} onChange={e => set("hora_llegada", e.target.value)} />
        </Field>

        <Field label="Origen">
          <Input value={form.origen} onChange={e => set("origen", e.target.value)} placeholder="Punto de partida" />
        </Field>
        <Field label="Destino" required>
          <Input value={form.destino} onChange={e => set("destino", e.target.value)} placeholder="Destino de la ruta" />
        </Field>

        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Propósito">
            <Input value={form.proposito} onChange={e => set("proposito", e.target.value)} placeholder="Visita a cliente, entrega de documentos..." />
          </Field>
        </div>

        <Field label="KM recorridos">
          <Input type="number" value={form.km_recorridos} onChange={e => set("km_recorridos", e.target.value)} placeholder="0" />
        </Field>

        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Observaciones">
            <Input value={form.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="Notas adicionales..." />
          </Field>
        </div>
      </div>

      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Btn>
      </div>
    </div>
  )
}
