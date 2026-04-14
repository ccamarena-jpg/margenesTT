import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, periodoActual } from "../lib/utils"
import { Spinner, Modal, Field, Input, Select, Btn } from "../components/ui"

const TIPO_GRUPO_LABEL = {
  admin_general:      "Administrativo general",
  equipo_ejecutivo:   "Equipo ejecutivo",
  operaciones_almacen: "Operaciones / Almacén",
  conductores:        "Conductores",
}

const TIPO_GRUPO_COLOR = {
  admin_general:       "#534AB7",
  equipo_ejecutivo:    "#185FA5",
  operaciones_almacen: "#0F6E56",
  conductores:         "#BA7517",
}

function BadgeGrupo({ tipo }) {
  const color = TIPO_GRUPO_COLOR[tipo] || "#888780"
  const label = TIPO_GRUPO_LABEL[tipo] || tipo
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{label}</span>
  )
}

function BadgeScope({ scope }) {
  const esProyecto = scope === "proyecto"
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: esProyecto ? "#1D9E7522" : "#185FA522",
      color: esProyecto ? "#1D9E75" : "#185FA5",
      border: `1px solid ${esProyecto ? "#1D9E7544" : "#185FA544"}`,
    }}>
      {esProyecto ? "Proyecto" : "% Facturación"}
    </span>
  )
}

export default function ModuloPlanilla() {
  const { usuario } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState(null)
  const [filtros, setFiltros] = useState({ tipo: "", scope: "", periodo: periodoActual() })

  const canEdit = ["admin", "gerencia", "rrhh"].includes(usuario?.rol)

  useEffect(() => { fetchGrupos(); fetchProyectos() }, [])

  const fetchGrupos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("planilla_grupos")
      .select("*, proyectos(nombre, cliente)")
      .order("tipo")
      .order("created_at", { ascending: false })
    setGrupos(data || [])
    setLoading(false)
  }

  const fetchProyectos = async () => {
    const { data } = await supabase
      .from("proyectos")
      .select("id, nombre, cliente")
      .eq("estado", "activo")
    setProyectos(data || [])
  }

  const gruposFiltrados = grupos.filter(g => {
    if (filtros.tipo && g.tipo !== filtros.tipo) return false
    if (filtros.scope && g.scope_asignacion !== filtros.scope) return false
    if (filtros.periodo && g.periodo !== filtros.periodo) return false
    return true
  })

  const totalPlanilla    = gruposFiltrados.reduce((s, g) => s + (g.costo_total_mes || 0), 0)
  const totalDirecto     = gruposFiltrados.filter(g => g.scope_asignacion === "proyecto").reduce((s, g) => s + (g.costo_total_mes || 0), 0)
  const totalDistribuido = gruposFiltrados.filter(g => g.scope_asignacion === "todos").reduce((s, g) => s + (g.costo_total_mes || 0), 0)

  const porTipo = Object.keys(TIPO_GRUPO_LABEL).map(tipo => ({
    tipo,
    total: gruposFiltrados.filter(g => g.tipo === tipo).reduce((s, g) => s + (g.costo_total_mes || 0), 0)
  })).filter(t => t.total > 0).sort((a, b) => b.total - a.total)

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro de planilla?")) return
    await supabase.from("planilla_grupos").delete().eq("id", id)
    fetchGrupos()
  }

  const exportCSV = () => {
    const rows = [["Tipo","Grupo","Responsable","Ejecutivo","Asignación","Proyecto","Costo mensual","Período"]]
    gruposFiltrados.forEach(g => rows.push([
      TIPO_GRUPO_LABEL[g.tipo] || g.tipo,
      g.nombre_grupo,
      g.responsable,
      g.ejecutivo_asignado || "",
      g.scope_asignacion === "proyecto" ? "Proyecto directo" : "% Facturación",
      g.proyectos?.nombre || "",
      g.costo_total_mes,
      g.periodo,
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `planilla_${filtros.periodo || "todos"}.csv`
    a.click()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Planilla</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {gruposFiltrados.length} grupo{gruposFiltrados.length !== 1 ? "s" : ""} · {fmt(totalPlanilla)} costo total
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>↓ Exportar</Btn>
          {canEdit && <Btn onClick={() => { setGrupoActivo(null); setShowModal(true) }}>+ Registrar grupo</Btn>}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Total planilla</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalPlanilla)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>costo del período</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Costos directos</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1D9E75" }}>{fmt(totalDirecto)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>asignados a proyecto</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Overhead</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#185FA5" }}>{fmt(totalDistribuido)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>por % facturación</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Grupos</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{gruposFiltrados.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>registrados</div>
        </div>
      </div>

      {/* Desglose por tipo */}
      {porTipo.length > 0 && (
        <div style={{ background: "var(--bg)", borderRadius: 14, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 }}>Desglose por tipo</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {porTipo.map(({ tipo, total }) => {
              const pct = totalPlanilla > 0 ? (total / totalPlanilla * 100).toFixed(0) : 0
              return (
                <div key={tipo} style={{ flex: "1 1 160px", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 10, borderLeft: `3px solid ${TIPO_GRUPO_COLOR[tipo] || "#888"}` }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{TIPO_GRUPO_LABEL[tipo]}</div>
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
        <Select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={{ width: 210 }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_GRUPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filtros.scope} onChange={e => setFiltros(f => ({ ...f, scope: e.target.value }))} style={{ width: 180 }}>
          <option value="">Toda asignación</option>
          <option value="proyecto">Proyecto directo</option>
          <option value="todos">% Facturación</option>
        </Select>
        <Input type="month" value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))} style={{ width: 160 }} />
        {Object.values(filtros).some(Boolean) && (
          <Btn variant="secondary" onClick={() => setFiltros({ tipo: "", scope: "", periodo: periodoActual() })} style={{ fontSize: 12 }}>✕ Limpiar</Btn>
        )}
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Tipo","Grupo / Responsable","Asignación","Proyecto","Costo mensual",""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No hay registros de planilla para este período</td></tr>
              )}
              {gruposFiltrados.map((g, i) => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                  <td style={{ padding: "14px 16px" }}><BadgeGrupo tipo={g.tipo} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{g.nombre_grupo}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{g.responsable}{g.ejecutivo_asignado ? ` · Ejecutivo: ${g.ejecutivo_asignado}` : ""}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}><BadgeScope scope={g.scope_asignacion} /></td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted)" }}>
                    {g.scope_asignacion === "proyecto" && g.proyectos
                      ? <><div style={{ fontWeight: 600, color: "var(--text)" }}>{g.proyectos.nombre}</div><div style={{ fontSize: 11 }}>{g.proyectos.cliente}</div></>
                      : <span style={{ fontSize: 12 }}>Todos los proyectos</span>
                    }
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 15, fontWeight: 700 }}>{fmt(g.costo_total_mes)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setGrupoActivo(g); setShowModal(true) }}>Editar</Btn>
                        <Btn variant="danger" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => handleDelete(g.id)}>✕</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {gruposFiltrados.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  <td colSpan={4} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total período</td>
                  <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 800 }}>{fmt(totalPlanilla)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={grupoActivo ? "Editar grupo" : "Registrar grupo de planilla"}>
        <FormGrupo
          grupo={grupoActivo}
          proyectos={proyectos}
          onSave={() => { setShowModal(false); fetchGrupos() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

function FormGrupo({ grupo, proyectos, onSave, onCancel }) {
  const { usuario } = useAuth()
  const [form, setForm] = useState({
    tipo:              grupo?.tipo || "",
    nombre_grupo:      grupo?.nombre_grupo || "",
    responsable:       grupo?.responsable || "",
    ejecutivo_asignado: grupo?.ejecutivo_asignado || "",
    costo_total_mes:   grupo?.costo_total_mes || "",
    periodo:           grupo?.periodo || periodoActual(),
    scope_asignacion:  grupo?.scope_asignacion || "todos",
    proyecto_id:       grupo?.proyecto_id || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.tipo) { setError("Selecciona el tipo de grupo"); return }
    if (!form.nombre_grupo) { setError("El nombre del grupo es obligatorio"); return }
    if (!form.responsable) { setError("El responsable es obligatorio"); return }
    if (!form.costo_total_mes) { setError("Ingresa el costo mensual"); return }
    if (!form.periodo) { setError("Selecciona el período"); return }
    if (form.scope_asignacion === "proyecto" && !form.proyecto_id) { setError("Selecciona el proyecto"); return }

    setLoading(true); setError("")

    const payload = {
      ...form,
      costo_total_mes: parseFloat(form.costo_total_mes),
      proyecto_id: form.scope_asignacion === "proyecto" ? form.proyecto_id : null,
      registrado_por: usuario.id,
    }

    const { error } = grupo
      ? await supabase.from("planilla_grupos").update(payload).eq("id", grupo.id)
      : await supabase.from("planilla_grupos").insert(payload)

    if (error) setError(error.message)
    else onSave()
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de grupo" required>
          <Select value={form.tipo} onChange={e => set("tipo", e.target.value)}>
            <option value="">Seleccionar</option>
            {Object.entries(TIPO_GRUPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Período" required>
          <Input type="month" value={form.periodo} onChange={e => set("periodo", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Nombre del grupo" required>
            <Input value={form.nombre_grupo} onChange={e => set("nombre_grupo", e.target.value)} placeholder="Ej: Equipo Administrativo, Equipo BAT..." />
          </Field>
        </div>
        <Field label="Responsable" required>
          <Input value={form.responsable} onChange={e => set("responsable", e.target.value)} placeholder="Nombre del responsable" />
        </Field>
        {form.tipo === "equipo_ejecutivo" && (
          <Field label="Ejecutivo asignado">
            <Select value={form.ejecutivo_asignado} onChange={e => set("ejecutivo_asignado", e.target.value)}>
              <option value="">Seleccionar</option>
              <option>CLAUDIA CAMARENA</option>
              <option>DANIELA OLAGUIBEL</option>
              <option>RAUL PULIDO</option>
            </Select>
          </Field>
        )}
        <Field label="Costo mensual (S/.)" required>
          <Input type="number" value={form.costo_total_mes} onChange={e => set("costo_total_mes", e.target.value)} placeholder="0.00" />
        </Field>

        {/* Asignación */}
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Tipo de asignación" required>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { value: "todos",    label: "Overhead — distribuir por % facturación", desc: "RRHH, gerencia, contabilidad, etc." },
                { value: "proyecto", label: "Directo — asignar a proyecto específico",  desc: "Operaciones, ejecutivos, conductores" },
              ].map(opt => (
                <label key={opt.value} style={{
                  flex: 1, display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${form.scope_asignacion === opt.value ? "#1a1a2e" : "var(--border)"}`,
                  background: form.scope_asignacion === opt.value ? "#1a1a2e08" : "transparent",
                }}>
                  <input type="radio" name="scope" value={opt.value} checked={form.scope_asignacion === opt.value} onChange={() => set("scope_asignacion", opt.value)} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {form.scope_asignacion === "proyecto" && (
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Proyecto" required>
              <Select value={form.proyecto_id} onChange={e => set("proyecto_id", e.target.value)}>
                <option value="">Seleccionar proyecto</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>)}
              </Select>
            </Field>
          </div>
        )}

        {form.scope_asignacion === "todos" && (
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ padding: "10px 14px", background: "#185FA511", border: "1px solid #185FA533", borderRadius: 8, fontSize: 13, color: "#185FA5" }}>
              Este costo se distribuirá entre todos los proyectos activos del período según su % de facturación sobre el total.
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginTop: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Btn>
      </div>
    </div>
  )
}
