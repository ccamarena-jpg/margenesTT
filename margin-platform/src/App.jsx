import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import { AuthContext } from "./context/AuthContext"
import { Spinner } from "./components/ui"
import Sidebar from "./components/Sidebar"
import Placeholder from "./components/Placeholder"
import LoginPage from "./pages/LoginPage"
import ModuloProyectos from "./pages/ProyectosPage"
import ModuloOperaciones from "./pages/OperacionesPage"
import ModuloAprobaciones from "./pages/AprobacionesPage"
import ModuloContabilidad from "./pages/ContabilidadPage"

function AppShell({ usuario }) {
  const [page, setPage] = useState("proyectos")

  const pages = {
    proyectos:    <ModuloProyectos />,
    operaciones:  <ModuloOperaciones />,
    aprobaciones: <ModuloAprobaciones />,
    contabilidad: <ModuloContabilidad />,
    planilla:     <Placeholder titulo="Planilla" descripcion="Carga mensual de costos de personal por grupo y proyecto." />,
    dashboard:    <Placeholder titulo="Dashboard mensual" descripcion="KPIs, márgenes por proyecto, gastos por categoría, alertas." />,
    historico:    <Placeholder titulo="Histórico" descripcion="Comparativo de márgenes y gastos mes a mes." />,
  }

  return (
    <AuthContext.Provider value={{ usuario }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={page} onNav={setPage} usuario={usuario} />
        <main style={{ marginLeft: 220, flex: 1, padding: "40px 48px", background: "var(--bg-tertiary)", minHeight: "100vh" }}>
          <div style={{ maxWidth: 1100 }}>
            {pages[page]}
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUsuario(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUsuario(session.user.id)
      else { setUsuario(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUsuario = async (id) => {
    const { data } = await supabase.from("usuarios").select("*").eq("id", id).single()
    setUsuario(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null); setUsuario(null)
  }

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  )

  if (!session) return <LoginPage onLogin={(s) => { setSession(s); fetchUsuario(s.user.id) }} />

  return <AppShell usuario={usuario} onLogout={handleLogout} />
}
