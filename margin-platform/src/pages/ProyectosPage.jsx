import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, periodoActual } from "../lib/utils"
import { Spinner, Modal, Field, Input, Select, Btn } from "../components/ui"

// ── Constantes ───────────────────────────────────────────────
const ESTADO_COLOR = { aprobado: "#185FA5", pagado: "#1D9E75" }
const ESTADO_LABEL = { aprobado: "Aprobado", pagado: "Pagado" }

const EJECUTIVOS = ["CLAUDIA CAMARENA", "DANIELA OLAGUIBEL", "RAUL PULIDO"]

function BadgeEstado({ estado }) {
  const color = ESTADO_COLOR[estado] || "#888780"
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{ESTADO_LABEL[estado] || estado || "—"}</span>
  )
}

const calcTotal = (r) =>
  (parseFloat(r?.monto || 0)) +
  (parseFloat(r?.facturacion_concursos || 0)) +
  (parseFloat(r?.fee_concursos || 0))

// ── Módulo principal ─────────────────────────────────────────
export default function ModuloProyectos() {
  const { usuario } = useAuth()
  const [rows, setRows] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [registroActivo, setRegistroActivo] = useState(null)
  const [filtros, setFiltros] = useState({ cliente: "", ejecutivo: "", estado: "", periodo: "" })

  const canEdit = ["admin", "gerencia"].includes(usuario?.rol)

  useEffect(() => { fetchDatos() }, [])

  const fetchDatos = async () => {
    setLoading(true)
    const [{ data: proy }, { data: facts }] = await Promise.all([
      supabase.from("proyectos").select("id, nombre, cliente, ejecutivo, tipo_servicio, responsable_pago, estado").order("created_at", { ascending: false }),
      supabase.from("facturas_proyecto").select("*").order("fecha_factura", { ascending: false }),
    ])

    const proyList = proy || []
    const factList = facts || []
    setProyectos(proyList)

    // Aplanar: una fila por factura + filas de proyectos sin facturas
    const proyConFactura = new Set(factList.map(f => f.proyecto_id))
    const filasFacturas = factList.map(f => ({
      ...f,
      _tipo: "factura",
      proyecto: proyList.find(p => p.id === f.proyecto_id) || {},
    }))
    const filasSinFactura = proyList
      .filter(p => !proyConFactura.has(p.id) && p.estado === "activo")
      .map(p => ({ _tipo: "sin_factura", proyecto_id: p.id, proyecto: p }))

    setRows([...filasFacturas, ...filasSinFactura])
    setLoading(false)
  }

  const rowsFiltrados = rows.filter(r => {
    const p = r.proyecto || {}
    if (filtros.cliente && !p.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())) return false
    if (filtros.ejecutivo && p.ejecutivo !== filtros.ejecutivo) return false
    if (filtros.estado && r.estado_cobro !== filtros.estado) return false
    if (filtros.periodo && r.periodo !== filtros.periodo) return false
    return true
  })

  const soloFacturas = rowsFiltrados.filter(r => r._tipo === "factura")
  const totalFacturado = soloFacturas.reduce((s, r) => s + calcTotal(r), 0)
  const totalAprobado  = soloFacturas.filter(r => r.estado_cobro === "aprobado").reduce((s, r) => s + calcTotal(r), 0)
  const totalPagado    = soloFacturas.filter(r => r.estado_cobro === "pagado").reduce((s, r) => s + calcTotal(r), 0)

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro?")) return
    await supabase.from("facturas_proyecto").delete().eq("id", id)
    fetchDatos()
  }

  const exportCSV = () => {
    const headers = ["Cliente","Ejecutivo","Tipo Servicio","Responsable Pago","Proyecto","Periodo","Importe","Fact. Concursos","Fee Concursos","Total","Importe OS","OS","HE","Factura","Fecha Factura","Fecha Vencimiento","Estado","Fecha Pago"]
    const rowsCSV = soloFacturas.map(r => [
      r.proyecto?.cliente || "", r.proyecto?.ejecutivo || "",
      r.proyecto?.tipo_servicio || "", r.proyecto?.responsable_pago || "",
      r.proyecto?.nombre || "", r.periodo || "",
      r.monto || 0, r.facturacion_concursos || 0, r.fee_concursos || 0,
      calcTotal(r), r.importe_os || 0, r.os || "", r.he || "",
      r.nro_factura_tt || "", r.fecha_factura || "", r.fecha_vencimiento || "",
      r.estado_cobro || "", r.fecha_pago || ""
    ])
    const csv = [headers, ...rowsCSV].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `proyectos_facturacion.csv`; a.click()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Proyectos</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {soloFacturas.length} registro{soloFacturas.length !== 1 ? "s" : ""} · {fmt(totalFacturado)} total facturado
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
          {canEdit && <Btn onClick={() => { setRegistroActivo(null); setShowModal(true) }}>+ Nuevo registro</Btn>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total facturado",  value: fmt(totalFacturado), sub: `${soloFacturas.length} facturas`, color: "var(--text)" },
          { label: "Aprobado",         value: fmt(totalAprobado),  sub: `${soloFacturas.filter(r => r.estado_cobro === "aprobado").length} facturas`, color: "#185FA5" },
          { label: "Pagado",           value: fmt(totalPagado),    sub: `${soloFacturas.filter(r => r.estado_cobro === "pagado").length} facturas`,   color: "#1D9E75" },
          { label: "Por cobrar",       value: fmt(totalAprobado - totalPagado), sub: "aprobado sin pagar", color: totalAprobado > totalPagado ? "#BA7517" : "var(--muted)" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input placeholder="Cliente" value={filtros.cliente} onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))} style={{ width: 140 }} />
        <Select value={filtros.ejecutivo} onChange={e => setFiltros(f => ({ ...f, ejecutivo: e.target.value }))} style={{ width: 180 }}>
          <option value="">Todos los ejecutivos</option>
          {EJECUTIVOS.map(e => <option key={e}>{e}</option>)}
        </Select>
        <Select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} style={{ width: 150 }}>
          <option value="">Todos los estados</option>
          <option value="aprobado">Aprobado</option>
          <option value="pagado">Pagado</option>
        </Select>
        <Input type="month" value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))} style={{ width: 160 }} />
        {Object.values(filtros).some(Boolean) && (
          <Btn variant="secondary" onClick={() => setFiltros({ cliente: "", ejecutivo: "", estado: "", periodo: "" })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12, background: "var(--bg)", minWidth: 1900 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                {[
                  "Cliente","Ejecutivo","Tipo Servicio","Resp. Pago",
                  "Proyecto","Periodo","Importe","Fact. Concursos",
                  "Fee Concursos","Total","Importe OS","OS","HE",
                  "Factura","Fecha Fact.","Fecha Venc.","Estado","Fecha Pago",""
                ].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: i >= 6 && i <= 11 ? "right" : "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsFiltrados.length === 0 && (
                <tr><td colSpan={19} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Sin registros</td></tr>
              )}
              {rowsFiltrados.map((r, i) => {
                const p = r.proyecto || {}
                const esSinFactura = r._tipo === "sin_factura"
                const total = calcTotal(r)
                return (
                  <tr key={r.id || `sf-${r.proyecto_id}`}
                    style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)", opacity: esSinFactura ? 0.5 : 1 }}>
                    <Celda>{p.cliente || "—"}</Celda>
                    <Celda>{p.ejecutivo || "—"}</Celda>
                    <Celda>{p.tipo_servicio || "—"}</Celda>
                    <Celda>{p.responsable_pago || "—"}</Celda>
                    <td style={{ padding: "12px 12px", whiteSpace: "nowrap", maxWidth: 180 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre || "—"}</div>
                    </td>
                    <Celda>{r.periodo || "—"}</Celda>
                    <CeldaNum>{r.monto ? fmt(r.monto) : "—"}</CeldaNum>
                    <CeldaNum>{r.facturacion_concursos ? fmt(r.facturacion_concursos) : "—"}</CeldaNum>
                    <CeldaNum>{r.fee_concursos ? fmt(r.fee_concursos) : "—"}</CeldaNum>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {total > 0 ? fmt(total) : "—"}
                    </td>
                    <CeldaNum>{r.importe_os ? fmt(r.importe_os) : "—"}</CeldaNum>
                    <Celda>{r.os || "—"}</Celda>
                    <Celda>{r.he || "—"}</Celda>
                    <Celda style={{ fontWeight: 600 }}>{r.nro_factura_tt || "—"}</Celda>
                    <Celda>{r.fecha_factura || "—"}</Celda>
                    <Celda>{r.fecha_vencimiento || "—"}</Celda>
                    <td style={{ padding: "12px 12px" }}>
                      {r.estado_cobro ? <BadgeEstado estado={r.estado_cobro} /> : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <Celda>{r.fecha_pago || "—"}</Celda>
                    <td style={{ padding: "12px 12px" }}>
                      {canEdit && !esSinFactura && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setRegistroActivo(r); setShowModal(true) }}>Editar</Btn>
                          <Btn variant="danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleDelete(r.id)}>✕</Btn>
                        </div>
                      )}
                      {canEdit && esSinFactura && (
                        <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setRegistroActivo({ proyecto_id: r.proyecto_id, proyecto: p }); setShowModal(true) }}>+ Factura</Btn>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {soloFacturas.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  <td colSpan={6} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(soloFacturas.reduce((s, r) => s + (r.monto || 0), 0))}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(soloFacturas.reduce((s, r) => s + (r.facturacion_concursos || 0), 0))}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(soloFacturas.reduce((s, r) => s + (r.fee_concursos || 0), 0))}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13 }}>{fmt(totalFacturado)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(soloFacturas.reduce((s, r) => s + (r.importe_os || 0), 0))}</td>
                  <td colSpan={8} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={registroActivo?.id ? "Editar registro" : "Nuevo registro"}>
        <FormRegistro
          registro={registroActivo}
          proyectos={proyectos}
          onSave={() => { setShowModal(false); fetchDatos() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

// ── Celdas helper ────────────────────────────────────────────
const Celda = ({ children, style }) => (
  <td style={{ padding: "12px 12px", whiteSpace: "nowrap", color: "var(--text)", ...style }}>{children}</td>
)
const CeldaNum = ({ children }) => (
  <td style={{ padding: "12px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{children}</td>
)

// ── Formulario combinado ─────────────────────────────────────
function FormRegistro({ registro, proyectos, onSave, onCancel }) {
  const { usuario } = useAuth()
  const [modoProyecto, setModoProyecto] = useState(registro?.proyecto_id ? "existente" : "nuevo")
  const [proyectoId, setProyectoId] = useState(registro?.proyecto_id || "")

  const proy = registro?.proyecto || {}

  const [formP, setFormP] = useState({
    nombre:          proy.nombre || "",
    cliente:         proy.cliente || "",
    ejecutivo:       proy.ejecutivo || "",
    tipo_servicio:   proy.tipo_servicio || "",
    responsable_pago: proy.responsable_pago || "",
  })

  const [formF, setFormF] = useState({
    periodo:                registro?.periodo || periodoActual(),
    monto:                  registro?.monto || "",
    facturacion_concursos:  registro?.facturacion_concursos || "",
    fee_concursos:          registro?.fee_concursos || "",
    importe_os:             registro?.importe_os || "",
    os:                     registro?.os || "",
    he:                     registro?.he || "",
    nro_factura_tt:         registro?.nro_factura_tt || "",
    fecha_factura:          registro?.fecha_factura || today(),
    fecha_vencimiento:      registro?.fecha_vencimiento || "",
    estado_cobro:           registro?.estado_cobro || "aprobado",
    fecha_pago:             registro?.fecha_pago || "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const setP = (k, v) => setFormP(f => ({ ...f, [k]: v }))
  const setF = (k, v) => setFormF(f => ({ ...f, [k]: v }))

  const totalPreview = (parseFloat(formF.monto || 0) + parseFloat(formF.facturacion_concursos || 0) + parseFloat(formF.fee_concursos || 0))

  // Cuando se selecciona un proyecto existente, pre-llenar campos
  const handleSelectProyecto = (id) => {
    setProyectoId(id)
    const p = proyectos.find(p => p.id === id)
    if (p) setFormP({ nombre: p.nombre, cliente: p.cliente, ejecutivo: p.ejecutivo, tipo_servicio: p.tipo_servicio || "", responsable_pago: p.responsable_pago || "" })
  }

  const handleSave = async () => {
    if (!formP.nombre || !formP.cliente || !formP.ejecutivo) { setError("Cliente, ejecutivo y proyecto son obligatorios"); return }

    setLoading(true); setError("")

    let pid = proyectoId

    if (registro?.id) {
      // Editar: actualizar proyecto y factura
      await supabase.from("proyectos").update({
        nombre: formP.nombre, cliente: formP.cliente, ejecutivo: formP.ejecutivo,
        tipo_servicio: formP.tipo_servicio, responsable_pago: formP.responsable_pago,
      }).eq("id", registro.proyecto_id)

      const { error } = await supabase.from("facturas_proyecto").update({
        ...formFParsed(formF), proyecto_id: registro.proyecto_id
      }).eq("id", registro.id)
      if (error) { setError(error.message); setLoading(false); return }

    } else {
      // Nuevo
      if (modoProyecto === "nuevo" || !pid) {
        const { data: newP, error: errP } = await supabase.from("proyectos").insert({
          nombre: formP.nombre, cliente: formP.cliente, ejecutivo: formP.ejecutivo,
          tipo_servicio: formP.tipo_servicio, responsable_pago: formP.responsable_pago,
          monto_contratado: 0, estado: "activo", creado_por: usuario.id,
        }).select("id").single()
        if (errP) { setError(errP.message); setLoading(false); return }
        pid = newP.id
      } else {
        // Actualizar proyecto existente con últimos datos
        await supabase.from("proyectos").update({
          tipo_servicio: formP.tipo_servicio, responsable_pago: formP.responsable_pago,
        }).eq("id", pid)
      }

      const { error } = await supabase.from("facturas_proyecto").insert({ ...formFParsed(formF), proyecto_id: pid })
      if (error) { setError(error.message); setLoading(false); return }
    }

    onSave()
    setLoading(false)
  }

  return (
    <div style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>
      {/* Sección Proyecto */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Datos del proyecto</div>

        {!registro?.id && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[{ id: "existente", label: "Proyecto existente" }, { id: "nuevo", label: "Nuevo proyecto" }].map(opt => (
              <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${modoProyecto === opt.id ? "#1a1a2e" : "var(--border)"}`, background: modoProyecto === opt.id ? "#1a1a2e08" : "transparent", fontSize: 13, fontWeight: 500 }}>
                <input type="radio" name="modoP" value={opt.id} checked={modoProyecto === opt.id} onChange={() => setModoProyecto(opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {modoProyecto === "existente" && !registro?.id ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Seleccionar proyecto" required>
                <Select value={proyectoId} onChange={e => handleSelectProyecto(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>)}
                </Select>
              </Field>
            </div>
          ) : null}

          <Field label="Cliente" required>
            <Input value={formP.cliente} onChange={e => setP("cliente", e.target.value)} placeholder="Nombre del cliente" readOnly={modoProyecto === "existente" && !registro?.id} />
          </Field>
          <Field label="Ejecutivo" required>
            <Select value={formP.ejecutivo} onChange={e => setP("ejecutivo", e.target.value)}>
              <option value="">Seleccionar</option>
              {EJECUTIVOS.map(e => <option key={e}>{e}</option>)}
            </Select>
          </Field>
          <Field label="Tipo de servicio">
            <Input value={formP.tipo_servicio} onChange={e => setP("tipo_servicio", e.target.value)} placeholder="Ej: Auditoría, SS, Consultoría..." />
          </Field>
          <Field label="Responsable de pago">
            <Input value={formP.responsable_pago} onChange={e => setP("responsable_pago", e.target.value)} placeholder="Nombre del responsable" />
          </Field>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Proyecto" required>
              <Input value={formP.nombre} onChange={e => setP("nombre", e.target.value)} placeholder="Nombre del proyecto" readOnly={modoProyecto === "existente" && !registro?.id} />
            </Field>
          </div>
        </div>
      </div>

      {/* Sección Factura */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Datos de facturación</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Periodo">
            <Input type="month" value={formF.periodo} onChange={e => setF("periodo", e.target.value)} />
          </Field>
          <Field label="Importe (S/.)">
            <Input type="number" value={formF.monto} onChange={e => setF("monto", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Facturación concursos (S/.)">
            <Input type="number" value={formF.facturacion_concursos} onChange={e => setF("facturacion_concursos", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Fee concursos (S/.)">
            <Input type="number" value={formF.fee_concursos} onChange={e => setF("fee_concursos", e.target.value)} placeholder="0.00" />
          </Field>

          {totalPreview > 0 && (
            <div style={{ gridColumn: "1/-1", padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(totalPreview)}</span>
            </div>
          )}

          <Field label="Importe OS (S/.)">
            <Input type="number" value={formF.importe_os} onChange={e => setF("importe_os", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="OS — N° Orden de Servicio">
            <Input value={formF.os} onChange={e => setF("os", e.target.value)} placeholder="OS-2026-001" />
          </Field>
          <Field label="HE — N° Referencia">
            <Input value={formF.he} onChange={e => setF("he", e.target.value)} placeholder="HE-001" />
          </Field>
          <Field label="N° Factura">
            <Input value={formF.nro_factura_tt} onChange={e => setF("nro_factura_tt", e.target.value)} placeholder="F001-00001" />
          </Field>
          <Field label="Fecha factura">
            <Input type="date" value={formF.fecha_factura} onChange={e => setF("fecha_factura", e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <Input type="date" value={formF.fecha_vencimiento} onChange={e => setF("fecha_vencimiento", e.target.value)} />
          </Field>
          <Field label="Estado">
            <Select value={formF.estado_cobro} onChange={e => setF("estado_cobro", e.target.value)}>
              <option value="aprobado">Aprobado</option>
              <option value="pagado">Pagado</option>
            </Select>
          </Field>
          <Field label="Fecha de pago">
            <Input type="date" value={formF.fecha_pago} onChange={e => setF("fecha_pago", e.target.value)} />
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

function formFParsed(formF) {
  return {
    ...formF,
    monto:                  formF.monto ? parseFloat(formF.monto) : null,
    facturacion_concursos:  formF.facturacion_concursos ? parseFloat(formF.facturacion_concursos) : null,
    fee_concursos:          formF.fee_concursos ? parseFloat(formF.fee_concursos) : null,
    importe_os:             formF.importe_os ? parseFloat(formF.importe_os) : null,
    fecha_vencimiento:      formF.fecha_vencimiento || null,
    fecha_pago:             formF.fecha_pago || null,
  }
}
