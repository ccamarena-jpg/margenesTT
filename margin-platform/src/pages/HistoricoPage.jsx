import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { fmt, fmtPct } from "../lib/utils"
import { Spinner } from "../components/ui"

// ── Helpers ──────────────────────────────────────────────────
const nextPeriod = (periodo) => {
  const [y, m] = periodo.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

const labelPeriodo = (periodo) => {
  const [y, m] = periodo.split("-").map(Number)
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${meses[m - 1]} ${y}`
}

const generarPeriodos = (n) => {
  const meses = []
  const hoy = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return meses
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

const tendencia = (actual, anterior) => {
  if (anterior === null || anterior === undefined || actual === null || actual === undefined) return null
  const diff = actual - anterior
  if (Math.abs(diff) < 0.005) return null
  return diff > 0 ? "▲" : "▼"
}

const tendenciaColor = (actual, anterior) => {
  if (anterior === null || actual === null) return "var(--muted)"
  return actual >= anterior ? "#1D9E75" : "#E24B4A"
}

// ── Cálculo por período ───────────────────────────────────────
function calcularPeriodo(periodo, { facturas, gastos, gastosFijos, planilla, proyectos }) {
  const facturasDelMes = facturas.filter(f => f.fecha_factura?.startsWith(periodo))
  const gastosDelMes   = gastos.filter(g => g.periodo === periodo)
  const fijosDelMes    = gastosFijos.filter(g => g.periodo === periodo)
  const planillaDelMes = planilla.filter(p => p.periodo === periodo)

  const facturadoPorProyecto = {}
  facturasDelMes.forEach(f => {
    facturadoPorProyecto[f.proyecto_id] = (facturadoPorProyecto[f.proyecto_id] || 0) + (f.monto || 0)
  })
  const totalFacturado = Object.values(facturadoPorProyecto).reduce((s, v) => s + v, 0)

  const gastoOpPorProyecto = {}
  gastosDelMes.forEach(g => {
    gastoOpPorProyecto[g.proyecto_id] = (gastoOpPorProyecto[g.proyecto_id] || 0) + (g.monto_real || 0)
  })

  const totalGastosFijos = fijosDelMes.reduce((s, g) => s + (g.monto_sin_igv || 0) + (g.igv || 0), 0)

  const planillaDirectaPorProyecto = {}
  let totalPlanillaOverhead = 0
  planillaDelMes.forEach(p => {
    if (p.scope_asignacion === "proyecto" && p.proyecto_id) {
      planillaDirectaPorProyecto[p.proyecto_id] = (planillaDirectaPorProyecto[p.proyecto_id] || 0) + (p.costo_total_mes || 0)
    } else {
      totalPlanillaOverhead += (p.costo_total_mes || 0)
    }
  })

  const filasPorProyecto = {}
  proyectos.forEach(p => {
    const facturado = facturadoPorProyecto[p.id] || 0
    const pct = totalFacturado > 0 ? facturado / totalFacturado : 0
    const gastosOp         = gastoOpPorProyecto[p.id] || 0
    const gastosFijosAsig  = totalGastosFijos * pct
    const planillaDirecta  = planillaDirectaPorProyecto[p.id] || 0
    const planillaOverhead = totalPlanillaOverhead * pct
    const totalCostos      = gastosOp + gastosFijosAsig + planillaDirecta + planillaOverhead
    const margen           = facturado - totalCostos
    const pctMargen        = facturado > 0 ? margen / facturado : null
    filasPorProyecto[p.id] = { facturado, totalCostos, margen, pctMargen }
  })

  const totalCostos  = Object.values(filasPorProyecto).reduce((s, f) => s + f.totalCostos, 0)
  const totalMargen  = totalFacturado - totalCostos
  const pctMargen    = totalFacturado > 0 ? totalMargen / totalFacturado : null

  return { totalFacturado, totalCostos, totalMargen, pctMargen, filasPorProyecto }
}

// ── Componente principal ──────────────────────────────────────
export default function ModuloHistorico() {
  const [rango, setRango] = useState(6)
  const [vista, setVista] = useState("resumen")
  const [loading, setLoading] = useState(true)
  const [datos, setDatos] = useState(null)

  useEffect(() => { cargarDatos() }, [rango])

  const cargarDatos = async () => {
    setLoading(true)
    const periodos = generarPeriodos(rango)
    const inicio   = periodos[0]
    const fin      = nextPeriod(periodos[periodos.length - 1])

    const [
      { data: proyectos },
      { data: facturas },
      { data: gastos },
      { data: gastosFijos },
      { data: planilla },
    ] = await Promise.all([
      supabase.from("proyectos").select("id, nombre, cliente, ejecutivo").eq("estado", "activo"),
      supabase.from("facturas_proyecto").select("proyecto_id, monto, fecha_factura").gte("fecha_factura", `${inicio}-01`).lt("fecha_factura", `${fin}-01`),
      supabase.from("gastos").select("proyecto_id, monto_real, periodo").eq("estado", "liquidado").in("periodo", periodos),
      supabase.from("gastos_fijos").select("monto_sin_igv, igv, periodo").in("periodo", periodos),
      supabase.from("planilla_grupos").select("proyecto_id, costo_total_mes, scope_asignacion, periodo").in("periodo", periodos),
    ])

    const raw = { facturas: facturas || [], gastos: gastos || [], gastosFijos: gastosFijos || [], planilla: planilla || [], proyectos: proyectos || [] }

    const resumen = periodos.map(p => ({
      periodo: p,
      ...calcularPeriodo(p, raw)
    }))

    setDatos({ periodos, resumen, proyectos: proyectos || [] })
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Histórico</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Comparativo de márgenes mes a mes</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Rango */}
          <div style={{ display: "flex", gap: 2 }}>
            {[3, 6, 12].map(n => (
              <button key={n} onClick={() => setRango(n)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: rango === n ? "#1a1a2e" : "transparent", color: rango === n ? "#fff" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{n}m</button>
            ))}
          </div>
          {/* Vista */}
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
            {[{ id: "resumen", label: "Resumen" }, { id: "proyectos", label: "Por proyecto" }].map(v => (
              <button key={v.id} onClick={() => setVista(v.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: vista === v.id ? "#1a1a2e" : "transparent", color: vista === v.id ? "#fff" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : !datos ? null : vista === "resumen" ? (
        <TablaResumen resumen={datos.resumen} />
      ) : (
        <TablaProyectos resumen={datos.resumen} proyectos={datos.proyectos} periodos={datos.periodos} />
      )}
    </div>
  )
}

// ── Vista: Resumen mensual ────────────────────────────────────
function TablaResumen({ resumen }) {
  return (
    <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Período","Facturado","Total costos","Margen bruto","% Margen","vs mes anterior"].map((h, i) => (
              <th key={i} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resumen.map((r, i) => {
            const anterior = i > 0 ? resumen[i - 1].pctMargen : null
            const tend = tendencia(r.pctMargen, anterior)
            const tColor = tendenciaColor(r.pctMargen, anterior)
            const tieneActividad = r.totalFacturado > 0 || r.totalCostos > 0

            return (
              <tr key={r.periodo} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)", opacity: tieneActividad ? 1 : 0.5 }}>
                <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14 }}>{labelPeriodo(r.periodo)}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {r.totalFacturado > 0 ? fmt(r.totalFacturado) : <span style={{ color: "var(--muted)", fontSize: 12 }}>sin datos</span>}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>
                  {r.totalCostos > 0 ? <span style={{ color: "#E24B4A" }}>{fmt(r.totalCostos)}</span> : "—"}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: margenColor(r.pctMargen) }}>
                  {r.totalFacturado > 0 ? fmt(r.totalMargen) : "—"}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  {r.pctMargen !== null ? (
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: margenBg(r.pctMargen), color: margenColor(r.pctMargen), fontWeight: 700, fontSize: 13 }}>
                      {fmtPct(r.pctMargen)}
                    </div>
                  ) : "—"}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, color: tColor }}>
                  {tend && anterior !== null ? (
                    <span>{tend} {Math.abs(((r.pctMargen - anterior) * 100)).toFixed(1)} pp</span>
                  ) : <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
            <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Promedio</td>
            {(() => {
              const conActividad = resumen.filter(r => r.totalFacturado > 0)
              if (conActividad.length === 0) return <td colSpan={5} />
              const avgFacturado = conActividad.reduce((s, r) => s + r.totalFacturado, 0) / conActividad.length
              const avgCostos    = conActividad.reduce((s, r) => s + r.totalCostos, 0) / conActividad.length
              const avgMargen    = conActividad.reduce((s, r) => s + r.totalMargen, 0) / conActividad.length
              const avgPct       = conActividad.reduce((s, r) => s + (r.pctMargen || 0), 0) / conActividad.length
              return (
                <>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmt(avgFacturado)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#E24B4A" }}>{fmt(avgCostos)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 13, color: margenColor(avgPct) }}>{fmt(avgMargen)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: margenBg(avgPct), color: margenColor(avgPct), fontWeight: 800, fontSize: 14 }}>
                      {fmtPct(avgPct)}
                    </div>
                  </td>
                  <td />
                </>
              )
            })()}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Vista: Por proyecto ───────────────────────────────────────
function TablaProyectos({ resumen, proyectos, periodos }) {
  if (proyectos.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No hay proyectos activos</div>
  )

  return (
    <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap", minWidth: 200 }}>Proyecto</th>
            {periodos.map(p => (
              <th key={p} style={{ padding: "12px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{labelPeriodo(p)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proyectos.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
              <td style={{ padding: "14px 16px" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{p.cliente}</div>
              </td>
              {periodos.map(periodo => {
                const r = resumen.find(r => r.periodo === periodo)
                const fila = r?.filasPorProyecto?.[p.id]
                const pct = fila?.pctMargen ?? null
                const tieneFacturado = (fila?.facturado || 0) > 0

                return (
                  <td key={periodo} style={{ padding: "10px 14px", textAlign: "center" }}>
                    {tieneFacturado ? (
                      <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 20, background: margenBg(pct), color: margenColor(pct), fontWeight: 700, fontSize: 12, minWidth: 60 }}>
                        {pct !== null ? fmtPct(pct) : "—"}
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
        Celdas con color muestran % margen del proyecto en ese mes. Verde ≥30% · Naranja 10-30% · Rojo &lt;10%
      </div>
    </div>
  )
}
