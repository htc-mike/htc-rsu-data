import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logAuthEvent = async (eventType, userData) => {
    try {
      await supabase.from('auth_logs').insert({
        user_id: userData?.id,
        event_type: eventType,
        event_data: userData
      })
    } catch (error) {
      console.error('Failed to log auth event:', error)
    }
  }

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Log auth event asynchronously (don't await to avoid blocking)
      logAuthEvent(event, session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback.html`,
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
