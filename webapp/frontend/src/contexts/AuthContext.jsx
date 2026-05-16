import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for tokens in localStorage from OAuth callback
    const accessToken = localStorage.getItem('sb-access-token')
    const refreshToken = localStorage.getItem('sb-refresh-token')

    if (accessToken) {
      // Set session from localStorage tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(() => {
        // Clear tokens from localStorage after setting session
        localStorage.removeItem('sb-access-token')
        localStorage.removeItem('sb-refresh-token')
      })
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://htc-mike.github.io/htc-rsu-data/auth/callback.html',
        skipBrowserRedirect: false
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
