import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { Spinner, Modal, Field, Input, Btn } from "../components/ui"

export default function ModuloProveedores() {
  const { usuario } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [proveedorActivo, setProveedorActivo] = useState(null)

  const canEdit = ["admin", "gerencia", "operaciones"].includes(usuario?.rol)

  useEffect(() => { fetchProveedores() }, [])

  const fetchProveedores = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("proveedores")
      .select("*")
      .order("razon_social", { ascending: true })
    setProveedores(data || [])
    setLoading(false)
  }

  const handleDelete = async (ruc) => {
    if (!window.confirm("¿Eliminar este proveedor del directorio?")) return
    await supabase.from("proveedores").delete().eq("ruc", ruc)
    fetchProveedores()
  }

  const filtrados = proveedores.filter(p =>
    p.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.ruc?.includes(busqueda)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Directorio de Proveedores</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            {filtrados.length} proveedor{filtrados.length !== 1 ? "es" : ""} registrado{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <Btn onClick={() => { setProveedorActivo(null); setShowModal(true) }}>+ Nuevo proveedor</Btn>
        )}
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por razón social o RUC..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 320 }}
        />
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div style={{ background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                {["RUC", "Razón Social", "Teléfono", "Email", "Contacto", ""].map((h, i) => (
                  <th key={i} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                  {busqueda ? "Sin resultados para esa búsqueda" : "No hay proveedores registrados"}
                </td></tr>
              )}
              {filtrados.map((p, i) => (
                <tr key={p.ruc} style={{ borderBottom: "1px solid var(--border-light)", background: i % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{p.ruc}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{p.razon_social}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{p.telefono || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{p.email || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{p.contacto || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="secondary" style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => { setProveedorActivo(p); setShowModal(true) }}>Editar</Btn>
                        <Btn variant="danger" style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => handleDelete(p.ruc)}>✕</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={proveedorActivo ? "Editar proveedor" : "Nuevo proveedor"}>
        <FormProveedor
          proveedor={proveedorActivo}
          onSave={() => { setShowModal(false); fetchProveedores() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

function FormProveedor({ proveedor, onSave, onCancel }) {
  const [form, setForm] = useState({
    ruc:          proveedor?.ruc || "",
    razon_social: proveedor?.razon_social || "",
    telefono:     proveedor?.telefono || "",
    email:        proveedor?.email || "",
    contacto:     proveedor?.contacto || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.ruc || !form.razon_social) { setError("RUC y razón social son obligatorios"); return }
    if (form.ruc.length !== 11) { setError("El RUC debe tener 11 dígitos"); return }

    setLoading(true); setError("")

    const { error } = proveedor
      ? await supabase.from("proveedores").update({
          razon_social: form.razon_social,
          telefono: form.telefono || null,
          email: form.email || null,
          contacto: form.contacto || null,
        }).eq("ruc", form.ruc)
      : await supabase.from("proveedores").upsert({
          ruc: form.ruc,
          razon_social: form.razon_social,
          telefono: form.telefono || null,
          email: form.email || null,
          contacto: form.contacto || null,
        }, { onConflict: "ruc" })

    if (error) setError(error.message)
    else onSave()
    setLoading(false)
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="RUC" required>
        <Input value={form.ruc} onChange={e => set("ruc", e.target.value)}
          placeholder="20123456789" maxLength={11}
          readOnly={!!proveedor}
          style={proveedor ? { background: "var(--bg-tertiary)" } : {}} />
      </Field>
      <Field label="Razón social" required>
        <Input value={form.razon_social} onChange={e => set("razon_social", e.target.value)}
          placeholder="Nombre o razón social" />
      </Field>
      <Field label="Teléfono">
        <Input value={form.telefono} onChange={e => set("telefono", e.target.value)}
          placeholder="01 234 5678" />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={e => set("email", e.target.value)}
          placeholder="contacto@proveedor.com" />
      </Field>
      <div style={{ gridColumn: "1/-1" }}>
        <Field label="Persona de contacto">
          <Input value={form.contacto} onChange={e => set("contacto", e.target.value)}
            placeholder="Nombre del contacto" />
        </Field>
      </div>

      {error && <div style={{ gridColumn: "1/-1", color: "#E24B4A", fontSize: 13, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}

      <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Btn>
      </div>
    </div>
  )
}
