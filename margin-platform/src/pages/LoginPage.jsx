import { useState } from "react"
import { supabase } from "../lib/supabase"
import { Field, Input, Btn } from "../components/ui"

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else onLogin(data.session)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}>
      <div style={{ width: 400, background: "var(--bg)", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: "#1a1a2e" }}>TT Audit</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Plataforma de márgenes</div>
        </div>
        <form onSubmit={handleLogin}>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@ttaudit.com" required />
          </Field>
          <Field label="Contraseña" required>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          {error && <div style={{ color: "#E24B4A", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#E24B4A11", borderRadius: 8 }}>{error}</div>}
          <Btn style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Btn>
        </form>
      </div>
    </div>
  )
}
