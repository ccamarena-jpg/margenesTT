import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, TIPO_GASTO_LABEL } from "../lib/utils"
import { Spinner, Modal, Field, Btn, BadgeGasto } from "../components/ui"

export default function ModuloAprobaciones() {
  const { usuario } = useAuth()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [showRechazoModal, setShowRechazoModal] = useState(false)
  const [gastoRechazo, setGastoRechazo] = useState(null)

  useEffect(() => { fetchPendientes() }, [])

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
