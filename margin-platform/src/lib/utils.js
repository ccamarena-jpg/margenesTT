export const fmt = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(n || 0)
export const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`
export const today = () => new Date().toISOString().split("T")[0]
export const periodoActual = () => new Date().toISOString().slice(0, 7)

export const ESTADOS_LABEL = { activo: "Activo", cerrado: "Cerrado", suspendido: "Suspendido" }
export const ESTADOS_COLOR  = { activo: "#1D9E75", cerrado: "#888780", suspendido: "#BA7517" }
export const ROL_LABEL = {
  admin: "Admin", gerencia: "Gerencia", operaciones: "Operaciones",
  contabilidad: "Contabilidad", rrhh: "RRHH"
}

export const TIPO_GASTO_LABEL = {
  caja_chica: "Caja chica", reembolsable: "Reembolsable",
  movilidad: "Movilidad", proyectado: "Proyectado"
}
export const TIPO_GASTO_COLOR = {
  caja_chica: "#534AB7", reembolsable: "#185FA5",
  movilidad: "#0F6E56", proyectado: "#BA7517"
}
export const ESTADO_GASTO_LABEL = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobado_proyectado: "Aprobado — por liquidar",
  en_liquidacion: "En liquidación",
  liquidado: "Liquidado",
  rechazado: "Rechazado",
  pendiente_reaprobacion: "Pendiente re-aprobación"
}
export const ESTADO_GASTO_COLOR = {
  borrador: "#888780", pendiente_aprobacion: "#BA7517",
  aprobado_proyectado: "#185FA5", en_liquidacion: "#534AB7",
  liquidado: "#1D9E75", rechazado: "#E24B4A",
  pendiente_reaprobacion: "#D85A30"
}
