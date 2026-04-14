import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, periodoActual } from "../lib/utils"
import { Spinner, Modal, Field, Input, Select, Btn } from "../components/ui"
import ProveedorSearch, { guardarProveedor } from "../components/ProveedorSearch"

const TIPO_GASTO_FIJO_LABEL = {
  alquiler:       "Alquiler",
  seguro:         "Seguro",
  servicio:       "Servicio público",
  software:       "Software / Suscripción",
  comunicaciones: "Comunicaciones",
  mantenimiento:  "Mantenimiento",
  otros:          "Otros",
}

const TIPO_GASTO_FIJO_COLOR = {
  alquiler:       "#185FA5",
  seguro:         "#534AB7",
  servicio:       "#0F6E56",
  software:       "#1D9E75",
  comunicaciones: "#BA7517",
  mantenimiento:  "#D85A30",
  otros:          "#888780",
}

function BadgeGastoFijo({ tipo }) {
  const color = TIPO_GASTO_FIJO_COLOR[tipo] || "#888780"
  const label = TIPO_GASTO_FIJO_LABEL[tipo] || tipo
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{label}</span>
  )
}

export default function ModuloContabilidad() {
  const { usuario } = useAuth()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [gastoActivo, setGastoActivo] = useState(null)
  const [filtros, setFiltros] = useState({ tipo: "", periodo: periodoActual() })

  const canEdit = ["admin", "gerencia", "contabilidad"].includes(usuario?.rol)

  useEffect(() => { fetchGastos() }, [])

  const fetchGastos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("gastos_fijos")
      .select("*")
      .order("fecha_contable", { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  const gastosFiltrados = gastos.filter(g => {
    if (filtros.tipo && g.tipo !== filtros.tipo) return false
    if (filtros.periodo && g.periodo !== filtros.periodo) return false
    return true
  })

  const totalSinIGV = gastosFiltrados.reduce((s, g) => s + (g.monto_sin_igv || 0), 0)
  const totalIGV    = gastosFiltrados.reduce((s, g) => s + (g.igv || 0), 0)
  const totalBruto  = totalSinIGV + totalIGV

  // Desglose por tipo para KPI
  const porTipo = Object.keys(TIPO_GASTO_FIJO_LABEL).map(tipo => ({
    tipo,
    total: gastosFiltrados.filter(g => g.tipo === tipo).reduce((s, g) => s + (g.monto_sin_igv || 0) + (g.igv || 0), 0)
  })).filter(t => t.total > 0).sort((a, b) => b.total - a.total)

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este gasto fijo?")) return
    await supabase.from("gastos_fijos").delete().eq("id", id)
    fetchGastos()
  }

  const exportCSV = () => {
    const rows = [["Tipo","Descripción","RUC Proveedor","Razón Social","N° Comprobante","Fecha","Monto sin IGV","IGV","Total","Período"]]
    gastosFiltrados.forEach(g => rows.push([
      TIPO_GASTO_FIJO_LABEL[g.tipo] || g.tipo,
      g.descripcion,
      g.ruc_proveedor || "",
      g.razon_social_proveedor || "",
      g.nro_comprobante || "",
      g.fecha_contable || "",
      g.monto_sin_igv || 0,
      g.igv || 0,
      (g.monto_sin_igv || 0) + (g.igv || 0),
      g.periodo || "",
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `gastos_fijos_${filtros.periodo || "todos"}.csv`
    a.click()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Contabilidad</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {gastosFiltrados.length} registro{gastosFiltrados.length !== 1 ? "s" : ""} · {fmt(totalBruto)} total período
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
          {canEdit && <Btn onClick={() => { setGastoActivo(null); setShowModal(true) }}>+ Nuevo gasto fijo</Btn>}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Total sin IGV</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalSinIGV)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>base imponible</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>IGV</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalIGV)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>18%</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Total bruto</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalBruto)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>inc. IGV</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Registros</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{gastosFiltrados.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{Object.keys(TIPO_GASTO_FIJO_LABEL).length} categorías</div>
        </div>
      </div>

      {/* Desglose por tipo */}
      {porTipo.length > 0 && (
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 }}>Desglose por categoría</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {porTipo.map(({ tipo, total }) => {
              const pct = totalBruto > 0 ? (total / totalBruto * 100).toFixed(0) : 0
              return (
                <div key={tipo} style={{ flex: "1 1 140px", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 10, borderLeft: `3px solid ${TIPO_GASTO_FIJO_COLOR[tipo] || "#888780"}` }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{TIPO_GASTO_FIJO_LABEL[tipo]}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(total)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{pct}% del total</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={{ width: 200 }}>
          <option value="">Todas las categorías</option>
          {Object.entries(TIPO_GASTO_FIJO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Input type="month" value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))} style={{ width: 160 }} />
        {Object.values(filtros).some(Boolean) && (
          <Btn variant="secondary" onClick={() => setFiltros({ tipo: "", periodo: periodoActual() })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Categoría","Descripción","Proveedor","Comprobante","Fecha","Sin IGV","IGV","Total",""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No hay gastos fijos registrados para este período</td></tr>
              )}
              {gastosFiltrados.map((g, i) => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                  <td style={{ padding: "14px 16px" }}><BadgeGastoFijo tipo={g.tipo} /></td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 500 }}>{g.descripcion}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)" }}>
                    {g.razon_social_proveedor
                      ? <><div style={{ fontWeight: 600, color: "var(--text)" }}>{g.razon_social_proveedor}</div><div>{g.ruc_proveedor}</div></>
                      : g.ruc_proveedor || "—"
                    }
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)" }}>{g.nro_comprobante || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{g.fecha_contable || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{fmt(g.monto_sin_igv)}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)" }}>{g.igv ? fmt(g.igv) : "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>{fmt((g.monto_sin_igv || 0) + (g.igv || 0))}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setGastoActivo(g); setShowModal(true) }}>Editar</Btn>
                        <Btn variant="danger" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => handleDelete(g.id)}>✕</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {gastosFiltrados.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  <td colSpan={5} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total período</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700 }}>{fmt(totalSinIGV)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700 }}>{fmt(totalIGV)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800 }}>{fmt(totalBruto)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={gastoActivo ? "Editar gasto fijo" : "Nuevo gasto fijo"}>
        <FormGastoFijo
          gasto={gastoActivo}
          onSave={() => { setShowModal(false); fetchGastos() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

function FormGastoFijo({ gasto, onSave, onCancel }) {
  const { usuario } = useAuth()
  const [form, setForm] = useState({
    tipo:                   gasto?.tipo || "",
    descripcion:            gasto?.descripcion || "",
    ruc_proveedor:          gasto?.ruc_proveedor || "",
    razon_social_proveedor: gasto?.razon_social_proveedor || "",
    nro_comprobante:        gasto?.nro_comprobante || "",
    fecha_contable:         gasto?.fecha_contable || today(),
    monto_sin_igv:          gasto?.monto_sin_igv || "",
    igv:                    gasto?.igv || "",
    periodo:                gasto?.periodo || periodoActual(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleMontoSinIGV = (v) => {
    set("monto_sin_igv", v)
    if (v) set("igv", (parseFloat(v) * 0.18).toFixed(2))
    else set("igv", "")
  }

  const total = (parseFloat(form.monto_sin_igv || 0) + parseFloat(form.igv || 0))

  const handleSave = async () => {
    if (!form.tipo) { setError("Selecciona una categoría"); return }
    if (!form.descripcion) { setError("La descripción es obligatoria"); return }
    if (!form.monto_sin_igv) { setError("Ingresa el monto sin IGV"); return }
    if (!form.periodo) { setError("Selecciona el período"); return }

    setLoading(true); setError("")

    const payload = {
      ...form,
      monto_sin_igv: parseFloat(form.monto_sin_igv),
      igv: form.igv ? parseFloat(form.igv) : null,
      scope_asignacion: "todos",
      registrado_por: usuario.id,
    }

    const { error } = gasto
      ? await supabase.from("gastos_fijos").update(payload).eq("id", gasto.id)
      : await supabase.from("gastos_fijos").insert(payload)

    if (error) setError(error.message)
    else { guardarProveedor(form.ruc_proveedor, form.razon_social_proveedor); onSave() }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Categoría" required>
          <Select value={form.tipo} onChange={e => set("tipo", e.target.value)}>
            <option value="">Seleccionar</option>
            {Object.entries(TIPO_GASTO_FIJO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Período" required>
          <Input type="month" value={form.periodo} onChange={e => set("periodo", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Descripción" required>
            <Input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Ej: Alquiler oficina Miraflores — Enero 2026" />
          </Field>
        </div>
        <ProveedorSearch
          ruc={form.ruc_proveedor}
          razonSocial={form.razon_social_proveedor}
          onChange={(ruc, razonSocial) => { set("ruc_proveedor", ruc); set("razon_social_proveedor", razonSocial) }}
        />
        <Field label="N° Comprobante">
          <Input value={form.nro_comprobante} onChange={e => set("nro_comprobante", e.target.value)} placeholder="F001-00001" />
        </Field>
        <Field label="Fecha contable">
          <Input type="date" value={form.fecha_contable} onChange={e => set("fecha_contable", e.target.value)} />
        </Field>
        <Field label="Monto sin IGV (S/.)" required>
          <Input type="number" value={form.monto_sin_igv} onChange={e => handleMontoSinIGV(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="IGV (18%)">
          <Input type="number" value={form.igv} onChange={e => set("igv", e.target.value)} placeholder="0.00" />
        </Field>
      </div>

      {total > 0 && (
        <div style={{ marginTop: 4, padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Total a registrar</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(total)}</span>
        </div>
      )}

      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Btn>
      </div>
    </div>
  )
}
