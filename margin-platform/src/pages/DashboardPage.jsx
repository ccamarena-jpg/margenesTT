import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { fmt, fmtPct, periodoActual } from "../lib/utils"
import { Spinner, Input } from "../components/ui"

// ── Helpers ──────────────────────────────────────────────────
const nextPeriod = (periodo) => {
  const [y, m] = periodo.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

const margenColor = (pct) => {
  if (pct === null || pct === undefined) return "var(--muted)"
  if (pct >= 0.30) return "#1D9E75"
  if (pct >= 0.10) return "#BA7517"
  return "#E24B4A"
}

const margenBg = (pct) => {
  if (pct === null || pct === undefined) return "transparent"
  if (pct >= 0.30) return "#1D9E7511"
  if (pct >= 0.10) return "#BA751711"
  return "#E24B4A11"
}

// ── Componente barra de costo ─────────────────────────────────
function BarraCostos({ operaciones, gastosFijos, planillaDirecta, planillaOverhead, total }) {
  if (total === 0) return null
  const segmentos = [
    { label: "Operaciones",       valor: operaciones,     color: "#185FA5" },
    { label: "Gastos fijos",      valor: gastosFijos,     color: "#534AB7" },
    { label: "Planilla directa",  valor: planillaDirecta, color: "#0F6E56" },
    { label: "Planilla overhead", valor: planillaOverhead,color: "#BA7517" },
  ].filter(s => s.valor > 0)

  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2, marginBottom: 12 }}>
        {segmentos.map((s, i) => (
          <div key={i} style={{ width: `${(s.valor / total * 100).toFixed(1)}%`, background: s.color, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {segmentos.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "var(--muted)" }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>{fmt(s.valor)}</span>
            <span style={{ color: "var(--muted)" }}>({(s.valor / total * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────
export default function ModuloDashboard() {
  const [periodo, setPeriodo] = useState(periodoActual())
  const [loading, setLoading] = useState(true)
  const [datos, setDatos] = useState(null)

  useEffect(() => { calcularDashboard() }, [periodo])

  const calcularDashboard = async () => {
    setLoading(true)

    const [
      { data: proyectos },
      { data: facturas },
      { data: gastos },
      { data: gastosFijos },
      { data: planilla },
    ] = await Promise.all([
      supabase.from("proyectos").select("id, nombre, cliente, ejecutivo, monto_contratado, estado").eq("estado", "activo"),
      supabase.from("facturas_proyecto").select("proyecto_id, monto").gte("fecha_factura", `${periodo}-01`).lt("fecha_factura", `${nextPeriod(periodo)}-01`),
      supabase.from("gastos").select("proyecto_id, monto_real").eq("estado", "liquidado").eq("periodo", periodo),
      supabase.from("gastos_fijos").select("monto_sin_igv, igv").eq("periodo", periodo),
      supabase.from("planilla_grupos").select("proyecto_id, costo_total_mes, scope_asignacion").eq("periodo", periodo),
    ])

    // ── Totales globales ─────────────────────────────────────
    const facturadoPorProyecto = {}
    ;(facturas || []).forEach(f => {
      facturadoPorProyecto[f.proyecto_id] = (facturadoPorProyecto[f.proyecto_id] || 0) + (f.monto || 0)
    })

    const totalFacturado = Object.values(facturadoPorProyecto).reduce((s, v) => s + v, 0)

    const gastoOpPorProyecto = {}
    ;(gastos || []).forEach(g => {
      gastoOpPorProyecto[g.proyecto_id] = (gastoOpPorProyecto[g.proyecto_id] || 0) + (g.monto_real || 0)
    })

    const totalGastosFijos = (gastosFijos || []).reduce((s, g) => s + (g.monto_sin_igv || 0) + (g.igv || 0), 0)

    const planillaDirectaPorProyecto = {}
    let totalPlanillaOverhead = 0
    ;(planilla || []).forEach(p => {
      if (p.scope_asignacion === "proyecto" && p.proyecto_id) {
        planillaDirectaPorProyecto[p.proyecto_id] = (planillaDirectaPorProyecto[p.proyecto_id] || 0) + (p.costo_total_mes || 0)
      } else {
        totalPlanillaOverhead += (p.costo_total_mes || 0)
      }
    })

    // ── Cálculo por proyecto ─────────────────────────────────
    const filas = (proyectos || []).map(p => {
      const facturado = facturadoPorProyecto[p.id] || 0
      const pct = totalFacturado > 0 ? facturado / totalFacturado : 0

      const gastosOp         = gastoOpPorProyecto[p.id] || 0
      const gastosFijosAsig  = totalGastosFijos * pct
      const planillaDirecta  = planillaDirectaPorProyecto[p.id] || 0
      const planillaOverhead = totalPlanillaOverhead * pct

      const totalCostos = gastosOp + gastosFijosAsig + planillaDirecta + planillaOverhead
      const margen      = facturado - totalCostos
      const pctMargen   = facturado > 0 ? margen / facturado : null

      return { ...p, facturado, pct, gastosOp, gastosFijosAsig, planillaDirecta, planillaOverhead, totalCostos, margen, pctMargen }
    }).sort((a, b) => b.facturado - a.facturado)

    // ── Totales globales ─────────────────────────────────────
    const totalCostosGlobal    = filas.reduce((s, f) => s + f.totalCostos, 0)
    const totalMargenGlobal    = totalFacturado - totalCostosGlobal
    const pctMargenGlobal      = totalFacturado > 0 ? totalMargenGlobal / totalFacturado : null

    const totalGastosOp        = filas.reduce((s, f) => s + f.gastosOp, 0)
    const totalPlanillaDirecta = filas.reduce((s, f) => s + f.planillaDirecta, 0)

    setDatos({
      filas,
      totalFacturado,
      totalCostosGlobal,
      totalMargenGlobal,
      pctMargenGlobal,
      totalGastosOp,
      totalGastosFijos,
      totalPlanillaDirecta,
      totalPlanillaOverhead,
    })
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Márgenes por proyecto · período seleccionado</p>
        </div>
        <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: 170 }} />
      </div>

      {loading ? <Spinner /> : !datos ? null : (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total facturado",  value: fmt(datos.totalFacturado),    sub: "facturas emitidas en el período", color: "var(--text)" },
              { label: "Total costos",     value: fmt(datos.totalCostosGlobal), sub: "op + fijos + planilla",           color: "#E24B4A" },
              { label: "Margen bruto",     value: fmt(datos.totalMargenGlobal), sub: "facturado − costos",              color: margenColor(datos.pctMargenGlobal) },
              { label: "% Margen",         value: datos.pctMargenGlobal !== null ? fmtPct(datos.pctMargenGlobal) : "—", sub: "margen / facturado", color: margenColor(datos.pctMargenGlobal) },
            ].map((k, i) => (
              <div key={i} style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Desglose global de costos */}
          {datos.totalCostosGlobal > 0 && (
            <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 }}>Desglose de costos del período</div>
              <BarraCostos
                operaciones={datos.totalGastosOp}
                gastosFijos={datos.totalGastosFijos}
                planillaDirecta={datos.totalPlanillaDirecta}
                planillaOverhead={datos.totalPlanillaOverhead}
                total={datos.totalCostosGlobal}
              />
            </div>
          )}

          {/* Tabla por proyecto */}
          <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Proyecto","Facturado","Operaciones","G. Fijos","Planilla","Total costos","Margen","% Margen"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.filas.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No hay proyectos activos</td></tr>
                )}
                {datos.filas.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{f.cliente} · {f.ejecutivo}</div>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                      {fmt(f.facturado)}
                      {f.facturado === 0 && <div style={{ fontSize: 10, color: "var(--muted)" }}>sin facturas</div>}
                    </td>
                    <Celda valor={f.gastosOp} />
                    <Celda valor={f.gastosFijosAsig} esAsignado />
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>
                      <div>{fmt(f.planillaDirecta + f.planillaOverhead)}</div>
                      {(f.planillaDirecta > 0 || f.planillaOverhead > 0) && (
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {f.planillaDirecta > 0 && `dir: ${fmt(f.planillaDirecta)} `}
                          {f.planillaOverhead > 0 && `ovh: ${fmt(f.planillaOverhead)}`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#E24B4A" }}>
                      {fmt(f.totalCostos)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: margenColor(f.pctMargen) }}>
                      {fmt(f.margen)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      {f.pctMargen !== null ? (
                        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: margenBg(f.pctMargen), color: margenColor(f.pctMargen), fontWeight: 700, fontSize: 13 }}>
                          {fmtPct(f.pctMargen)}
                        </div>
                      ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {datos.filas.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 800 }}>{fmt(datos.totalFacturado)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmt(datos.totalGastosOp)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmt(datos.totalGastosFijos)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmt(datos.totalPlanillaDirecta + datos.totalPlanillaOverhead)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#E24B4A" }}>{fmt(datos.totalCostosGlobal)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 800, color: margenColor(datos.pctMargenGlobal) }}>{fmt(datos.totalMargenGlobal)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {datos.pctMargenGlobal !== null && (
                        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: margenBg(datos.pctMargenGlobal), color: margenColor(datos.pctMargenGlobal), fontWeight: 800, fontSize: 14 }}>
                          {fmtPct(datos.pctMargenGlobal)}
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Nota metodología */}
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span>G. Fijos y Planilla overhead se distribuyen proporcionalmente según % de facturación de cada proyecto.</span>
            {datos.totalFacturado === 0 && <span style={{ color: "#BA7517", fontWeight: 600 }}>Sin facturación en el período — no hay distribución de overhead.</span>}
          </div>
        </>
      )}
    </div>
  )
}

function Celda({ valor, esAsignado }) {
  return (
    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>
      {valor > 0
        ? <>{fmt(valor)}{esAsignado && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>asignado</div>}</>
        : <span style={{ color: "var(--muted)" }}>—</span>
      }
    </td>
  )
}
