import { createContext, useContext, useMemo, useState } from 'react'
import client from '../api/client'
import type { AuthResponse, UserPayload } from '../types/api'

type AuthContextType = {
  user: UserPayload | null
  isAuthenticated: boolean
  loginWithPassword: (identifier: string, password: string) => Promise<void>
  loginWithOtp: (phone: string, verificationCode: string) => Promise<void>
  requestOtp: (phone: string, name?: string, accountType?: string) => Promise<void>
  signUp: (payload: Record<string, string>) => Promise<void>
  forgotPassword: (phone: string) => Promise<void>
  resetPassword: (phone: string, verificationCode: string, password: string, confirmPassword: string) => Promise<void>
  setCurrentUser: (user: UserPayload) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function persistSession(user: UserPayload) {
  localStorage.setItem('agri_user_token', user.jwtToken)
  localStorage.setItem('agri_user', JSON.stringify(user))
}

function assertApiSuccess<T extends { errors?: string | string[] }>(data: T) {
  if (data?.errors) {
    if (Array.isArray(data.errors)) throw new Error(data.errors[0] || 'Request failed')
    throw new Error(data.errors)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(() => {
    const raw = localStorage.getItem('agri_user')
    return raw ? (JSON.parse(raw) as UserPayload) : null
  })

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,

    async requestOtp(phone: string, name?: string, accountType?: string) {
      const res = await client.post('/api/get_otp', { phone, name, accountType })
      assertApiSuccess(res.data)
    },

    async loginWithOtp(phone: string, verificationCode: string) {
      const res = await client.post<AuthResponse>('/api/auth_user', { phone, verificationCode })
      assertApiSuccess(res.data as AuthResponse & { errors?: string | string[] })
      if (!res.data.user) throw new Error('Authentication failed')
      persistSession(res.data.user)
      setUser(res.data.user)
    },

    async loginWithPassword(identifier: string, password: string) {
      const res = await client.post<AuthResponse>('/api/sign_in', { identifier, password })
      assertApiSuccess(res.data as AuthResponse & { errors?: string | string[] })
      if (!res.data.user) throw new Error('Authentication failed')
      persistSession(res.data.user)
      setUser(res.data.user)
    },

    async signUp(payload: Record<string, string>) {
      const res = await client.post<AuthResponse>('/api/sign_up', payload)
      assertApiSuccess(res.data as AuthResponse & { errors?: string | string[] })
      if (!res.data.user) throw new Error('Sign up failed')
      persistSession(res.data.user)
      setUser(res.data.user)
    },

    async forgotPassword(phone: string) {
      const res = await client.post('/api/forgot_password', { phone })
      assertApiSuccess(res.data)
    },

    async resetPassword(phone: string, verificationCode: string, password: string, confirmPassword: string) {
      const res = await client.post('/api/reset_password', { phone, verificationCode, password, confirmPassword })
      assertApiSuccess(res.data)
    },

    setCurrentUser(nextUser: UserPayload) {
      persistSession(nextUser)
      setUser(nextUser)
    },

    logout() {
      localStorage.removeItem('agri_user_token')
      localStorage.removeItem('agri_user')
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
