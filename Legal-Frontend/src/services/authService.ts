const win: any = typeof window !== 'undefined' ? window : {}
const runtimeBackend = win.__BACKEND_URL__
const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL
const AUTH_BASE = backendUrl ? `${backendUrl}/api/v1/auth` : `/api/v1/auth`

const STORAGE_KEY = 'legal_auth_tokens'

type TokenBundle = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
}

type AuthResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

type Credentials = { email: string; password: string; name?: string }

const loadTokens = (): TokenBundle | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as TokenBundle : null
  } catch (_e) {
    return null
  }
}

const saveTokens = (res: AuthResponse) => {
  const expires_at = Date.now() + res.expires_in * 1000 - 5000
  const bundle: TokenBundle = {
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    expires_in: res.expires_in,
    expires_at,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle))
  return bundle
}

const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const authService = {
  async register({ email, password, name }: Credentials) {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Đăng ký thất bại')
    }
    const data = await res.json() as AuthResponse
    return saveTokens(data)
  },

  async login({ email, password }: Credentials) {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Đăng nhập thất bại')
    }
    const data = await res.json() as AuthResponse
    return saveTokens(data)
  },

  async refresh() {
    const tokens = loadTokens()
    if (!tokens?.refresh_token) {
      throw new Error('Thiếu refresh token')
    }
    const res = await fetch(`${AUTH_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    })
    if (!res.ok) {
      clearTokens()
      const text = await res.text()
      throw new Error(text || 'Làm mới phiên thất bại')
    }
    const data = await res.json() as AuthResponse
    return saveTokens(data)
  },

  logout() {
    clearTokens()
  },

  getStoredTokens() {
    return loadTokens()
  },

  async getValidAccessToken(): Promise<string | null> {
    const tokens = loadTokens()
    if (!tokens) return null
    if (tokens.expires_at > Date.now()) {
      return tokens.access_token
    }
    try {
      const refreshed = await this.refresh()
      return refreshed.access_token
    } catch (_e) {
      clearTokens()
      return null
    }
  },

  async authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const token = await this.getValidAccessToken()
    const headers = new Headers(init.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(input, { ...init, headers })
  },
}

export type AuthTokens = TokenBundle
