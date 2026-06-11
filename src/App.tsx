import { Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import Challenges from './pages/Challenges'
import Profile from './pages/Profile'

export default function App() {
  const { loading, session, profile } = useAuth()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">Loading…</div>
  }

  // Not signed in → auth screen.
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Signed in but no profile yet → must pick a username.
  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="metrics" element={<Catalog />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
