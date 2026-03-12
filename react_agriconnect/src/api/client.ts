import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const client = axios.create({
  baseURL: API_URL,
})

export function toApiAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('agri_user_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Cache-Control'] = 'no-cache'
  config.headers.Pragma = 'no-cache'
  return config
})

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const errors = err.response?.data?.errors
    if (Array.isArray(errors) && errors[0]) return errors[0]
    if (typeof errors === 'string') return errors
  }
  return fallback
}

export default client
