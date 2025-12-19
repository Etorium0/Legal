import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, AuthTokens } from '../services/authService'

interface AuthContextValue {
  tokens: AuthTokens | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTokens(authService.getStoredTokens())
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const t = await authService.login({ email, password })
    setTokens(t)
  }

  const register = async (email: string, password: string, name?: string) => {
    const t = await authService.register({ email, password, name })
    setTokens(t)
  }

  const logout = () => {
    authService.logout()
    setTokens(null)
  }

  return (
    <AuthContext.Provider value={{ tokens, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
