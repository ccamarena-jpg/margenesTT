export default function Placeholder({ titulo, descripcion }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{titulo}</h2>
      <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 340 }}>{descripcion}</p>
      <div style={{ marginTop: 16, padding: "8px 20px", background: "var(--bg-secondary)", borderRadius: 20, fontSize: 12, color: "var(--muted)", border: "1px solid var(--border)" }}>Próxima fase</div>
    </div>
  )
}
