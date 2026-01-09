import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, AuthTokens } from '../services/authService'
import { jwtDecode } from 'jwt-decode'

interface User {
  id: string
  sub?: string  // JWT subject (user ID)
  email?: string
  name?: string
  role?: string
  exp?: number
}

interface AuthContextValue {
  tokens: AuthTokens | null
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => 
{
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => 
  {
    const loadTokens = async () => 
    {
      try 
      {
        const storedTokens = authService.getStoredTokens()
        setTokens(storedTokens)
        if (storedTokens?.access_token) 
{
          try 
{
            const decoded = jwtDecode<User>(storedTokens.access_token)
            setUser({ ...decoded, id: decoded.sub || decoded.id })
          }
 catch (e) 
{
            console.error('Failed to decode token:', e)
          }
        }
      } 
      catch (error) 
      {
        console.error('Failed to load tokens:', error)
      } 
      finally 
      {
        setLoading(false)
      }
    }
    loadTokens()
  }, [])

  const login = async (email: string, password: string) => 
{
    const t = await authService.login({ email, password })
    setTokens(t)
    if (t?.access_token) 
{
      try 
{
        const decoded = jwtDecode<User>(t.access_token)
        setUser({ ...decoded, id: decoded.sub || decoded.id })
      }
 catch (e) 
{
        console.error('Failed to decode token:', e)
      }
    }
  }

  const register = async (email: string, password: string, name?: string) => 
{
    const t = await authService.register({ email, password, name })
    setTokens(t)
    if (t?.access_token) 
{
      try 
{
        const decoded = jwtDecode<User>(t.access_token)
        setUser({ ...decoded, id: decoded.sub || decoded.id })
      }
 catch (e) 
{
        console.error('Failed to decode token:', e)
      }
    }
  }

  const logout = () => 
{
    authService.logout()
    setTokens(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ tokens, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => 
{
  const ctx = useContext(AuthContext)
  if (!ctx) {throw new Error('useAuth must be used within AuthProvider')}
  return ctx
}
