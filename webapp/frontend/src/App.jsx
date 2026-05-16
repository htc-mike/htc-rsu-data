import { BrowserRouter as Router, Routes, Route, Navigate, HashRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import Login from './components/Login'
import Races from './pages/Races'
import RaceDetail from './pages/RaceDetail'
import Registrations from './pages/Registrations'
import Results from './pages/Results'
import Analytics from './pages/Analytics'
import { supabase } from './supabaseClient'

// Handle OAuth callback
import { useEffect } from 'react'

function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data.session) {
        window.location.href = '/htc-rsu-data/'
      } else {
        // If no session, check URL hash for OAuth response
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        if (accessToken) {
          // Exchange the access token for a session
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token')
          })
          window.location.href = '/htc-rsu-data/'
        }
      }
    }
    handleAuth()
  }, [])

  return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Signing in...</div>
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function AppContent() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading...</div>
  }
  
  return (
    <Router basename="/htc-rsu-data">
      <div className="min-h-screen bg-[#0F172A]">
        {user && <Navigation />}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<ProtectedRoute><Races /></ProtectedRoute>} />
            <Route path="/races" element={<ProtectedRoute><Races /></ProtectedRoute>} />
            <Route path="/races/:raceId" element={<ProtectedRoute><RaceDetail /></ProtectedRoute>} />
            <Route path="/registrations" element={<ProtectedRoute><Registrations /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
