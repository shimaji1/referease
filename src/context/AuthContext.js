'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    if (!supabase) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const p = await loadProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const p = await loadProfile(session.user.id)
        setProfile(p)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName, role, extra = {}) => {
    if (!supabase) return { error: { message: 'Database not connected' } }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        phone: extra.phone || null,
        cpso_number: extra.cpso_number || null,
        clinic_name: extra.clinic_name || null,
      })
      if (profileError) return { error: profileError }
      const p = await loadProfile(data.user.id)
      setProfile(p)
    }
    return { data }
  }

  const signIn = async (email, password) => {
    if (!supabase) return { error: { message: 'Database not connected' } }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    if (data.user) {
      const p = await loadProfile(data.user.id)
      setProfile(p)
    }
    return { data }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Changes the password for the currently signed-in user. Re-verifies the current
  // password first (Supabase has no dedicated "check password" call, so a real
  // sign-in with it doubles as the check) before applying the new one.
  const updatePassword = async (currentPassword, newPassword) => {
    if (!supabase || !user) return { error: { message: 'Database not connected' } }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (verifyError) return { error: { message: 'Current password is incorrect' } }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const updateProfile = async (fields) => {
    if (!supabase || !user) return { error: { message: 'Not signed in' } }
    const { error } = await supabase.from('profiles').update(fields).eq('id', user.id)
    if (!error) { const p = await loadProfile(user.id); setProfile(p) }
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updatePassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
