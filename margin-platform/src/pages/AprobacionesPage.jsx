import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, TIPO_GASTO_LABEL } from "../lib/utils"
import { Spinner, Modal, Field, Btn, BadgeGasto, Select, Input } from "../components/ui"

export default function ModuloAprobaciones() {
  const { usuario } = useAuth()
  const [gastosAll, setGastosAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [showRechazoModal, setShowRechazoModal] = useState(false)
  const [gastoRechazo, setGastoRechazo] = useState(null)
  const [filtros, setFiltros] = useState({ solicitante: "", proyecto_id: "", fechaDesde: "", fechaHasta: "" })

  useEffect(() => { fetchTodos() }, [])

  const fetchTodos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("gastos")
      .select("*, proyectos(id, nombre, cliente, monto_contratado, ejecutivo)")
      .order("created_at", { ascending: false })
    setGastosAll(data || [])
    setLoading(false)
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
    fetchTodos()
  }

  const rechazar = async () => {
    await supabase.from("gastos").update({
      estado: "rechazado",
      motivo_rechazo: motivoRechazo,
      aprobado_por: usuario.id,
    }).eq("id", gastoRechazo.id)
    setShowRechazoModal(false)
    setMotivoRechazo("")
    fetchTodos()
  }

  const exportCSV = () => {
    const rows = [["Tipo","Solicitante","Proyecto","Cliente","Monto Contratado","Descripción","Monto","Comprobante","RUC","Estado","Fecha Envío"]]
    gastosFiltrados.forEach(g => rows.push([
      TIPO_GASTO_LABEL[g.tipo], g.responsable, g.proyectos?.nombre || "", g.proyectos?.cliente || "",
      g.proyectos?.monto_contratado || "", g.descripcion,
      g.monto_real || g.monto_proyectado || "", g.nro_comprobante || "", g.ruc_proveedor || "", g.estado,
      g.created_at ? new Date(g.created_at).toLocaleDateString("es-PE") : ""
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `aprobaciones_${today()}.csv`; a.click()
  }

  // Opciones de filtro derivadas de los datos
  const solicitantes = [...new Set(gastosAll.map(g => g.responsable).filter(Boolean))].sort()
  const proyectosUnicos = [...new Map(
    gastosAll.filter(g => g.proyectos?.id).map(g => [g.proyectos.id, g.proyectos])
  ).values()].sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Aplicar filtros
  const gastosFiltrados = gastosAll.filter(g => {
    if (filtros.solicitante && g.responsable !== filtros.solicitante) return false
    if (filtros.proyecto_id && String(g.proyecto_id) !== String(filtros.proyecto_id)) return false
    if (filtros.fechaDesde && g.created_at < filtros.fechaDesde) return false
    if (filtros.fechaHasta && g.created_at > filtros.fechaHasta + "T23:59:59") return false
    return true
  })

  const gastosPendientes = gastosFiltrados.filter(g =>
    ["pendiente_aprobacion", "pendiente_reaprobacion"].includes(g.estado)
  )

  const monto = (g) => g.monto_real || g.monto_proyectado || 0

  // Acumulados totales (todos los estados)
  const totalSolicitado = gastosFiltrados.reduce((s, g) => s + monto(g), 0)
  const totalPendiente  = gastosPendientes.reduce((s, g) => s + monto(g), 0)
  const totalAprobado   = gastosFiltrados
    .filter(g => ["aprobado_proyectado", "liquidado"].includes(g.estado))
    .reduce((s, g) => s + monto(g), 0)
  const totalRechazado  = gastosFiltrados
    .filter(g => g.estado === "rechazado")
    .reduce((s, g) => s + monto(g), 0)

  const hayFiltros = Object.values(filtros).some(Boolean)

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Aprobaciones</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {gastosPendientes.length} pendiente{gastosPendientes.length !== 1 ? "s" : ""} · Total acumulado: <strong>{fmt(totalSolicitado)}</strong>
          </p>
        </div>
        <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
      </div>

      {/* KPIs acumulados */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total solicitado",  value: fmt(totalSolicitado), sub: `${gastosFiltrados.length} gastos`, color: "var(--text)" },
          { label: "Pendiente",         value: fmt(totalPendiente),  sub: `${gastosPendientes.length} gastos`, color: "#BA7517" },
          { label: "Aprobado / Liquidado", value: fmt(totalAprobado), sub: `${gastosFiltrados.filter(g => ["aprobado_proyectado","liquidado"].includes(g.estado)).length} gastos`, color: "#1D9E75" },
          { label: "Rechazado",         value: fmt(totalRechazado),  sub: `${gastosFiltrados.filter(g => g.estado === "rechazado").length} gastos`, color: "#E24B4A" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Select value={filtros.solicitante} onChange={e => setFiltros(f => ({ ...f, solicitante: e.target.value }))} style={{ width: 180 }}>
          <option value="">Todos los solicitantes</option>
          {solicitantes.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filtros.proyecto_id} onChange={e => setFiltros(f => ({ ...f, proyecto_id: e.target.value }))} style={{ width: 220 }}>
          <option value="">Todos los proyectos</option>
          {proyectosUnicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
        <Input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))} style={{ width: 150 }} title="Fecha desde" placeholder="Desde" />
        <Input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))} style={{ width: 150 }} title="Fecha hasta" placeholder="Hasta" />
        {hayFiltros && (
          <Btn variant="secondary" onClick={() => setFiltros({ solicitante: "", proyecto_id: "", fechaDesde: "", fechaHasta: "" })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {loading ? <Spinner /> : gastosPendientes.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✓</div>
          <h3 style={{ margin: 0 }}>Sin pendientes</h3>
          <p style={{ color: "var(--muted)" }}>{hayFiltros ? "No hay gastos pendientes con los filtros aplicados" : "No hay gastos esperando aprobación"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gastosPendientes.map(g => {
            const presupuesto = g.proyectos?.monto_contratado || 0
            const montoG = monto(g)
            const pctPresupuesto = presupuesto > 0 ? (montoG / presupuesto * 100).toFixed(1) : null
            return (
              <div key={g.id} style={{ background: "var(--bg)", borderRadius: 14, padding: 24, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <BadgeGasto tipo={g.tipo} />
                    <BadgeGasto estado={g.estado} />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>por {g.responsable}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(montoG)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
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
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Fecha requerimiento</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{g.created_at ? new Date(g.created_at).toLocaleDateString("es-PE") : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Presupuesto proyecto</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{presupuesto > 0 ? fmt(presupuesto) : "—"}</div>
                    {g.monto_proyectado > 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Proyectado: {fmt(g.monto_proyectado)}</div>}
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
