// ── Helpers ───────────────────────────────────────────────────
const EMPRESA  = "TRADITIONAL TRADE AUDIT S.A.C."
const RUC_EMP  = "20557910663"
const MESES    = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]

const n2 = (n) => parseFloat(n || 0).toFixed(2)
const fmtFecha = (s) => {
  if (!s) return ""
  const [y, m, d] = s.split("-")
  return `${d}/${m}/${y}`
}
const mesNombre = (s) => {
  if (!s) return ""
  const m = parseInt((s.split("-")[1] || s.split("/")[0]) || 0)
  return MESES[m - 1] || ""
}

const LOGO_HTML = `<span style="font-family:Arial Black,Arial;font-size:13pt;font-weight:900;color:#1a3a6b;letter-spacing:1px">TT&nbsp;<span style="color:#c8a400">AUDIT</span></span>`

const BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:8.5pt;color:#000;background:#fff}
  @page{margin:1.2cm}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #999;padding:2px 4px;vertical-align:middle}
  th{background:#d9d9d9;font-weight:bold;text-align:center;font-size:8pt}
  .nb{border:none!important}
  .bold{font-weight:bold}
  .center{text-align:center}
  .right{text-align:right}
  .gray-bar{background:#808080;color:#000;text-align:center;font-weight:bold;padding:4px 0;font-size:10pt;margin:8px 0}
  .sub-gray{background:#c0c0c0;color:#000;text-align:center;font-weight:bold;padding:2px 0;font-size:8.5pt;margin:6px 0}
`

const abrirVentana = (html, titulo) => {
  const w = window.open("", "_blank", "width=1100,height=800")
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 800)
}

// ── FORMATO 1: REEMBOLSOS ─────────────────────────────────────
export const generarReembolso = (gastos, opts) => {
  const { nombre, cargo, fechaDesembolso, fechaRendicion, tipoPago } = opts
  const total = gastos.reduce((s, g) => s + parseFloat(g.monto_real || 0), 0)

  const [y, m] = (fechaDesembolso || "").split("-")
  const mesDisp = m ? MESES[parseInt(m) - 1] : fechaDesembolso || ""

  const filas = gastos.map((g, i) => {
    const [fy, fm, fd] = (g.fecha_gasto || "").split("-")
    return `<tr>
      <td class="center">${i + 1}</td>
      <td class="center">${fd ? `${fd}/${fm}/${fy}` : ""}</td>
      <td class="center">${(g.tipo_comprobante || "").toUpperCase()}</td>
      <td class="center">${g.nro_serie || ""}</td>
      <td class="center">${g.nro_comprobante || ""}</td>
      <td class="center" style="font-size:7.5pt">${g.ruc_proveedor || ""}</td>
      <td>${g.razon_social_proveedor || "PENDIENTE"}</td>
      <td>${g.proyectos?.nombre || ""}</td>
      <td>${g.concepto || g.descripcion || ""}</td>
      <td class="right">${g.base_imponible ? n2(g.base_imponible) : ""}</td>
      <td class="right">${g.igv ? n2(g.igv) : ""}</td>
      <td class="right">${g.monto_exonerado ? n2(g.monto_exonerado) : ""}</td>
      <td class="right bold">S/ ${n2(g.monto_real)}</td>
      <td></td>
    </tr>`
  }).join("")

  const vacias = Math.max(0, 6 - gastos.length)
  const filasVacias = Array(vacias).fill(`<tr style="height:20px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reembolsos — ${nombre}</title>
  <style>${BASE_CSS}@page{size:A4 landscape}</style></head>
  <body>
  <table style="margin-bottom:6px"><tr>
    <td class="nb" style="font-size:13pt;font-weight:bold;text-align:center">${EMPRESA}</td>
    <td class="nb" style="text-align:right;width:120px">${LOGO_HTML}</td>
  </tr></table>

  <div class="gray-bar">ENTREGAS A RENDIR O REEMBOLSOS</div>

  <table class="nb" style="margin-bottom:6px">
    <tr><td class="nb bold" colspan="3">Datos del trabajador receptor:</td></tr>
    <tr>
      <td class="nb" style="width:30%"></td>
      <td class="nb" style="width:20%">Nombres y Apellido:</td>
      <td class="nb bold">${nombre.toUpperCase()}</td>
    </tr>
    <tr>
      <td class="nb"></td>
      <td class="nb">Cargo:</td>
      <td class="nb bold">${cargo.toUpperCase()}</td>
    </tr>
  </table>

  <table class="nb" style="margin-bottom:8px">
    <tr>
      <td class="nb bold" style="width:22%">Fecha de Desembolso:</td>
      <td class="nb bold" style="width:20%">${mesDisp}</td>
      <td class="nb"></td>
    </tr>
    <tr>
      <td class="nb bold">Fecha de Rendición:</td>
      <td class="nb bold">${fechaRendicion ? fmtFecha(fechaRendicion) : ""}</td>
      <td class="nb"></td>
    </tr>
  </table>

  <table class="nb" style="margin-bottom:10px">
    <tr>
      <td class="nb bold" style="width:15%">Tipo de pago:</td>
      <td class="nb">
        Efectivo &nbsp;<span style="border:1px solid #000;padding:2px 18px">${tipoPago === "efectivo" ? "X" : "&nbsp;&nbsp;&nbsp;"}</span>
        &nbsp;&nbsp;&nbsp;
        Transferencia &nbsp;<span style="border:1px solid #000;padding:2px 18px">${tipoPago === "transferencia" ? "X" : "&nbsp;&nbsp;&nbsp;"}</span>
      </td>
    </tr>
  </table>

  <table style="width:55%;margin:0 auto 14px auto;border:1px solid #000">
    <tr>
      <td class="nb" style="padding:3px 10px">MONTO ENTREGADO</td>
      <td class="nb">S/</td>
      <td class="nb" style="border-bottom:1px solid #000;width:100px;text-align:right;padding-right:8px"></td>
    </tr>
    <tr>
      <td class="nb" style="padding:3px 10px">(-) GASTOS SUSTENTADOS</td>
      <td class="nb">S/</td>
      <td class="nb" style="border-bottom:1px solid #000;text-align:right;padding-right:8px">${n2(total)}</td>
    </tr>
    <tr>
      <td class="nb" style="padding:3px 10px">SALDO POR RENDIR/REEMBOLSAR</td>
      <td class="nb">S/</td>
      <td class="nb" style="border-bottom:1px solid #000;text-align:right;padding-right:8px"></td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width:3%">N°</th>
        <th rowspan="2" style="width:7%">FECHA</th>
        <th rowspan="2" style="width:9%">TIPO DE COMPROBANTE</th>
        <th rowspan="2" style="width:5%">N° DE SERIE</th>
        <th rowspan="2" style="width:8%">N° COMPROBANTE</th>
        <th rowspan="2" style="width:9%">RUC</th>
        <th colspan="2" style="background:#bfbfbf">PAGADO A:</th>
        <th rowspan="2">CONCEPTO</th>
        <th colspan="3" style="background:#bfbfbf">RAZÓN SOCIAL</th>
        <th rowspan="2" style="width:8%">TOTAL</th>
        <th rowspan="2" style="width:10%">OBSERVACIONES</th>
      </tr>
      <tr>
        <th>RAZÓN SOCIAL</th>
        <th style="width:8%">PROYECTO</th>
        <th style="width:7%">BASE IMPONIBLE</th>
        <th style="width:5%">IGV</th>
        <th style="width:6%">EXONERADO</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
      ${filasVacias}
      <tr>
        <td colspan="12" class="nb right bold" style="padding-right:6px">TOTAL</td>
        <td class="right bold">S/ ${n2(total)}</td>
        <td class="nb"></td>
      </tr>
    </tbody>
  </table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  abrirVentana(html)
}

// ── FORMATO 2: CAJA CHICA ─────────────────────────────────────
export const generarCajaChica = (gastos, opts) => {
  const { nombre, periodoDesde, periodoHasta, fondoPermanente } = opts
  const total = gastos.reduce((s, g) => s + parseFloat(g.monto_real || 0), 0)
  const fondo = parseFloat(fondoPermanente || 0)
  const saldo = fondo - total

  const filas = gastos.map((g, i) => {
    const [fy, fm, fd] = (g.fecha_gasto || "").split("-")
    return `<tr>
      <td class="center">${i + 1}</td>
      <td class="center">${fd ? `${fd}/${fm}/${fy}` : ""}</td>
      <td class="center">${g.nro_serie ? g.nro_serie + "-" : ""}${g.nro_comprobante || ""}</td>
      <td class="center" style="font-size:7.5pt">${g.ruc_proveedor || ""}</td>
      <td>${g.razon_social_proveedor || ""}</td>
      <td>${g.proyectos?.nombre || ""}</td>
      <td>${g.concepto || g.descripcion || ""}</td>
      <td class="right">${g.base_imponible ? n2(g.base_imponible) : "0.00"}</td>
      <td class="right">${g.igv ? n2(g.igv) : "0.00"}</td>
      <td class="right">${g.monto_exonerado ? n2(g.monto_exonerado) : "0.00"}</td>
      <td class="right bold">${n2(g.monto_real)}</td>
    </tr>`
  }).join("")

  const vacias = Math.max(0, 8 - gastos.length)
  const filasVacias = Array(vacias).fill(`<tr style="height:18px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="right">0.00</td><td class="right">0.00</td><td class="right">0.00</td><td class="right">0.00</td></tr>`).join("")

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Caja Chica — ${nombre}</title>
  <style>${BASE_CSS}@page{size:A4 landscape}</style></head>
  <body>
  <table style="margin-bottom:4px"><tr>
    <td class="nb" style="font-size:13pt;font-weight:bold;text-align:center">${EMPRESA}</td>
  </tr></table>

  <div class="gray-bar">LIQUIDACIÓN CAJA CHICA</div>

  <table class="nb" style="margin-bottom:8px">
    <tr>
      <td class="nb bold" style="width:14%">RESPONSABLE:</td>
      <td class="nb bold">${nombre.toUpperCase()}</td>
    </tr>
  </table>

  <table style="margin-bottom:12px">
    <tr>
      <td colspan="2" class="center bold" style="background:#d9d9d9">RELACIÓN DE GASTOS</td>
      <td colspan="3" class="center bold" style="background:#d9d9d9">EFECTIVO</td>
    </tr>
    <tr>
      <td class="nb bold" style="width:12%">PERIODO:</td>
      <td class="nb">${periodoDesde ? fmtFecha(periodoDesde) : ""} — ${periodoHasta ? fmtFecha(periodoHasta) : ""}</td>
      <td class="nb" style="width:28%">FONDO PERMANENTE</td>
      <td class="nb">S/</td>
      <td class="nb right" style="width:90px">${n2(fondo)}</td>
    </tr>
    <tr>
      <td class="nb bold">DESEMBOLSO DE GASTOS:</td>
      <td class="nb">${n2(total)}</td>
      <td class="nb">(-) EFECTIVO EN CAJA/REEMBOLS USUARIO</td>
      <td class="nb">S/</td>
      <td class="nb right" style="border-bottom:1px solid #000">${n2(total)}</td>
    </tr>
    <tr>
      <td class="nb bold">DEL:</td>
      <td class="nb">${periodoDesde ? fmtFecha(periodoDesde) : ""}</td>
      <td class="nb">SALDO EN CAJA/POR REEMBOLSAR</td>
      <td class="nb">S/</td>
      <td class="nb right">${n2(saldo)}</td>
    </tr>
    <tr>
      <td class="nb bold">AL:</td>
      <td class="nb">${periodoHasta ? fmtFecha(periodoHasta) : ""}</td>
      <td class="nb" colspan="3"></td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width:3%">N°</th>
        <th rowspan="2" style="width:8%">FECHA</th>
        <th rowspan="2" style="width:10%">N° DE COMPROBANTE</th>
        <th rowspan="2" style="width:9%">RUC</th>
        <th colspan="2" style="background:#bfbfbf">PAGADO A:</th>
        <th rowspan="2">CONCEPTO</th>
        <th colspan="4" style="background:#bfbfbf">RAZÓN SOCIAL</th>
      </tr>
      <tr>
        <th>RAZÓN SOCIAL</th>
        <th style="width:9%">PROYECTO</th>
        <th style="width:8%">BASE IMPONIBLE</th>
        <th style="width:5%">IGV</th>
        <th style="width:6%">EXONERADO</th>
        <th style="width:7%">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
      ${filasVacias}
      <tr>
        <td colspan="10" class="nb right bold" style="padding-right:6px">TOTAL</td>
        <td class="right bold">${n2(total)}</td>
      </tr>
    </tbody>
  </table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  abrirVentana(html)
}

// ── FORMATO 3: MOVILIDAD ──────────────────────────────────────
export const generarMovilidad = (gastos, opts) => {
  const { nombre, dni, periodo } = opts
  const totalViaje = gastos.reduce((s, g) => s + parseFloat(g.monto_real || 0), 0)
  const periodoDisp = periodo ? MESES[parseInt(periodo.split("-")[1]) - 1] + " " + periodo.split("-")[0] : ""
  const fechaEmision = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" })

  const filas = gastos.map((g) => {
    const [fy, fm, fd] = (g.fecha_gasto || "").split("-")
    const mes = fm ? MESES[parseInt(fm) - 1] : ""
    return `<tr style="height:28px">
      <td class="center" style="width:4%">${fd || ""}</td>
      <td class="center" style="width:9%">${mes}</td>
      <td class="center" style="width:5%">${fy || ""}</td>
      <td style="width:16%">${g.motivo_movilidad || g.descripcion || ""}</td>
      <td style="width:14%">${g.proyectos?.nombre || ""}</td>
      <td style="width:16%">${g.destino || ""}</td>
      <td class="right" style="width:8%">${n2(g.monto_real)}</td>
      <td style="width:8%"></td>
      <td style="width:20%"></td>
    </tr>`
  }).join("")

  const vacias = Math.max(0, 12 - gastos.length)
  const filasVacias = Array(vacias).fill(`<tr style="height:28px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Movilidad — ${nombre}</title>
  <style>${BASE_CSS}@page{size:A4 portrait}</style></head>
  <body>

  <table class="nb" style="margin-bottom:4px">
    <tr>
      <td class="nb" style="width:70%"></td>
      <td class="nb right" style="font-size:8pt">N°</td>
      <td class="nb" style="border:1px solid #000;width:60px;height:18px;text-align:center">&nbsp;</td>
    </tr>
  </table>

  <div style="background:#1a3a6b;color:#fff;text-align:center;font-weight:bold;padding:5px 0;font-size:10pt;margin-bottom:8px">
    PLANILLA POR GASTO DE MOVILIDAD- POR TRABAJADOR
  </div>

  <table style="margin-bottom:4px">
    <tr>
      <td class="nb bold" style="width:18%">Razón Social:</td>
      <td class="nb" style="border:1px solid #999;width:35%;padding:3px 6px">${EMPRESA.replace(" S.A.C.", "")}</td>
      <td class="nb" style="width:4%"></td>
      <td class="nb">Fecha de Emisión:</td>
      <td class="nb bold">${fechaEmision}</td>
      <td class="nb right">${LOGO_HTML}</td>
    </tr>
    <tr>
      <td class="nb bold">RUC:</td>
      <td class="nb" style="border:1px solid #999;padding:3px 6px">${RUC_EMP}</td>
      <td class="nb" colspan="4"></td>
    </tr>
    <tr>
      <td class="nb bold">Periodo:</td>
      <td class="nb" style="border:1px solid #999;padding:3px 6px">${periodoDisp.toUpperCase()}</td>
      <td class="nb" colspan="4"></td>
    </tr>
  </table>

  <table class="nb" style="margin:8px 0 4px 0">
    <tr><td class="nb bold" colspan="4" style="color:#1a3a6b">Datos del trabajador</td></tr>
    <tr>
      <td class="nb" style="width:22%;padding-left:12px">Nombres y Apellidos:</td>
      <td class="nb" style="border:1px solid #999;text-align:center;font-weight:bold;width:40%;padding:3px">${nombre.toUpperCase()}</td>
      <td class="nb" colspan="2"></td>
    </tr>
    <tr>
      <td class="nb" style="padding-left:12px">D.N.I.:</td>
      <td class="nb" style="border:1px solid #999;text-align:center;padding:3px">${dni || ""}</td>
      <td class="nb" colspan="2"></td>
    </tr>
  </table>

  <table style="margin-top:8px">
    <thead>
      <tr>
        <th colspan="3" style="color:#1a3a6b;background:#e8eef6">Fecha del Gasto</th>
        <th colspan="3" style="color:#1a3a6b;background:#e8eef6">Desplazamiento</th>
        <th colspan="3" style="color:#1a3a6b;background:#e8eef6">Monto Gastado por:</th>
      </tr>
      <tr>
        <th style="color:#1a3a6b">Día</th>
        <th style="color:#1a3a6b">Mes</th>
        <th style="color:#1a3a6b">Año</th>
        <th style="color:#1a3a6b">Motivo</th>
        <th style="color:#1a3a6b">Proyecto</th>
        <th style="color:#1a3a6b">Destino</th>
        <th style="color:#1a3a6b">Viaje</th>
        <th style="color:#1a3a6b">Día</th>
        <th style="color:#1a3a6b">Firma</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
      ${filasVacias}
      <tr>
        <td colspan="6" class="nb right bold" style="padding-right:8px;color:#1a3a6b">TOTAL</td>
        <td class="right bold">S/ ${n2(totalViaje)}</td>
        <td colspan="2" class="nb"></td>
      </tr>
    </tbody>
  </table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  abrirVentana(html)
}
