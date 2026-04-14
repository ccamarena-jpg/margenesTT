import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { fmt, today, periodoActual, TIPO_GASTO_LABEL, TIPO_GASTO_COLOR, ESTADO_GASTO_LABEL } from "../lib/utils"
import { Spinner, Modal, Field, Input, Select, Btn, BadgeGasto } from "../components/ui"
import ProveedorSearch, { guardarProveedor } from "../components/ProveedorSearch"

export default function ModuloOperaciones() {
  const { usuario } = useAuth()
  const [gastos, setGastos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [gastoActivo, setGastoActivo] = useState(null)
  const [showLiquidarModal, setShowLiquidarModal] = useState(false)
  const [filtros, setFiltros] = useState({ tipo: "", estado: "", proyecto: "", responsable: "", periodo: periodoActual() })

  const canAprobar  = ["admin", "gerencia"].includes(usuario?.rol)
  const esOperaciones = ["operaciones", "admin", "gerencia"].includes(usuario?.rol)

  useEffect(() => { fetchGastos(); fetchProyectos() }, [])

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

  const pendientes    = gastos.filter(g => g.estado === "pendiente_aprobacion").length
  const proyectados   = gastos.filter(g => g.estado === "aprobado_proyectado").length
  const totalSemana   = gastosFiltrados.filter(g => g.estado !== "rechazado").reduce((s, g) => s + (g.monto_real || g.monto_proyectado || 0), 0)
  const totalLiquidado = gastosFiltrados.filter(g => g.estado === "liquidado").reduce((s, g) => s + (g.monto_real || 0), 0)

  const enviarAprobacion = async (id) => {
    await supabase.from("gastos").update({ estado: "pendiente_aprobacion" }).eq("id", id)
    fetchGastos()
  }

  const exportCSV = () => {
    const rows = [["Tipo","Responsable","Proyecto","Descripción","Concepto","Monto Proyectado","Monto Real","RUC Proveedor","N° Comprobante","Fecha","Estado","Período"]]
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
            <Btn onClick={() => setTipoSeleccionado("menu")}>+ Nuevo gasto</Btn>
          )}
        </div>
      </div>

      {/* Selector de tipo */}
      {tipoSeleccionado === "menu" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { tipo: "caja_chica",   desc: "Con comprobante, fondo fijo" },
            { tipo: "reembolsable", desc: "Con comprobante, pago personal" },
            { tipo: "movilidad",    desc: "Sin comprobante, transporte" },
            { tipo: "proyectado",   desc: "Gasto futuro por ejecutar" },
          ].map(({ tipo, desc }) => (
            <div key={tipo} onClick={() => { setTipoSeleccionado(tipo); setGastoActivo(null); setShowModal(true) }}
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
          { label: "Pend. aprobación",   value: pendientes,         color: "#BA7517" },
          { label: "Proyectados activos", value: proyectados,        color: "#185FA5" },
          { label: "Total período",       value: fmt(totalSemana),   color: "var(--text)" },
          { label: "Total liquidado",     value: fmt(totalLiquidado), color: "#1D9E75" },
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
                {["Tipo","Responsable","Proyecto","Descripción","Monto","Comprobante","Fecha","Estado",""].map((h, i) => (
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

      <Modal open={showModal && tipoSeleccionado !== "menu"} onClose={() => { setShowModal(false); setTipoSeleccionado(null) }}
        title={gastoActivo ? `Editar — ${TIPO_GASTO_LABEL[tipoSeleccionado]}` : `Nuevo gasto — ${TIPO_GASTO_LABEL[tipoSeleccionado]}`}>
        <FormGasto tipo={tipoSeleccionado} gasto={gastoActivo} proyectos={proyectos}
          onSave={() => { setShowModal(false); setTipoSeleccionado(null); fetchGastos() }}
          onCancel={() => { setShowModal(false); setTipoSeleccionado(null) }} />
      </Modal>

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

    let monto_real = form.monto_real ? parseFloat(form.monto_real) : null
    if (!monto_real && form.base_imponible) {
      monto_real = parseFloat(form.base_imponible) + parseFloat(form.igv || 0) + parseFloat(form.monto_exonerado || 0)
    }

    const payload = {
      ...form, tipo,
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
    else { guardarProveedor(form.ruc_proveedor, form.razon_social_proveedor); onSave() }
    setLoading(false)
  }

  const tieneComprobante = tipo === "caja_chica" || tipo === "reembolsable"

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <ProveedorSearch
              ruc={form.ruc_proveedor}
              razonSocial={form.razon_social_proveedor}
              onChange={(ruc, razonSocial) => { set("ruc_proveedor", ruc); set("razon_social_proveedor", razonSocial) }}
            />
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
    tipo_comprobante: "factura", nro_serie: "", nro_comprobante: "",
    ruc_proveedor: gasto?.ruc_proveedor || "",
    razon_social_proveedor: gasto?.razon_social_proveedor || "",
    base_imponible: "", igv: "", monto_exonerado: "", monto_real: "",
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
      tipo: gasto.tipo,
    }).eq("id", gasto.id)
    if (error) setError(error.message)
    else { guardarProveedor(form.ruc_proveedor, form.razon_social_proveedor); onSave() }
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
        <ProveedorSearch
          ruc={form.ruc_proveedor}
          razonSocial={form.razon_social_proveedor || ""}
          onChange={(ruc, razonSocial) => { set("ruc_proveedor", ruc); set("razon_social_proveedor", razonSocial) }}
        />
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
