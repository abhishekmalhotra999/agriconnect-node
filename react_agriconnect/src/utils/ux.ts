import client from '../api/client'

export type SavedType = 'course' | 'product' | 'service'

export type SavedItem = {
  type: SavedType
  id: string
  title: string
  subtitle?: string
  image?: string
  link: string
  savedAt: number
}

export type NotificationItem = {
  id: string
  message: string
  link?: string
  createdAt: number
  read: boolean
}

const SAVED_KEY = 'agri_saved_items'
const RECENT_KEY = 'agri_recent_items'
const COACH_PREFIX = 'agri_coach_'
const NOTIF_KEY = 'agri_notifications'
const MAX_RECENT = 8
const MAX_NOTIFS = 20
let isHydrating = false

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new Event('agri-ux-update'))
  if (!isHydrating) {
    void syncUxToServer()
  }
}

export async function hydrateUxFromServer() {
  try {
    const token = localStorage.getItem('agri_user_token')
    if (!token) return

    const res = await client.get<{ savedItems?: SavedItem[]; recentItems?: SavedItem[]; notifications?: NotificationItem[] }>('/api/users/preferences')
    isHydrating = true
    localStorage.setItem(SAVED_KEY, JSON.stringify(Array.isArray(res.data?.savedItems) ? res.data.savedItems : []))
    localStorage.setItem(RECENT_KEY, JSON.stringify(Array.isArray(res.data?.recentItems) ? res.data.recentItems : []))
    localStorage.setItem(NOTIF_KEY, JSON.stringify(Array.isArray(res.data?.notifications) ? res.data.notifications : []))
    isHydrating = false
    window.dispatchEvent(new Event('agri-ux-update'))
  } catch {
    isHydrating = false
  }
}

export async function syncUxToServer() {
  try {
    const token = localStorage.getItem('agri_user_token')
    if (!token) return
    await client.put('/api/users/preferences', {
      savedItems: getSavedItems(),
      recentItems: getRecentItems(),
      notifications: getNotifications(),
    })
  } catch {
    // Keep UX responsive even when preference sync fails.
  }
}

export function getSavedItems(): SavedItem[] {
  return readJson<SavedItem[]>(SAVED_KEY, [])
}

export function getSavedByType(type: SavedType): SavedItem[] {
  return getSavedItems().filter((item) => item.type === type)
}

export function isSaved(type: SavedType, id: string | number): boolean {
  const key = `${type}:${id}`
  return getSavedItems().some((item) => `${item.type}:${item.id}` === key)
}

export function toggleSavedItem(next: Omit<SavedItem, 'savedAt'>): boolean {
  const all = getSavedItems()
  const key = `${next.type}:${next.id}`
  const exists = all.some((item) => `${item.type}:${item.id}` === key)
  if (exists) {
    writeJson(
      SAVED_KEY,
      all.filter((item) => `${item.type}:${item.id}` !== key),
    )
    return false
  }

  writeJson(SAVED_KEY, [{ ...next, savedAt: Date.now() }, ...all])
  pushNotification(`Saved: ${next.title}`, next.link)
  return true
}

export function getRecentItems(): SavedItem[] {
  return readJson<SavedItem[]>(RECENT_KEY, [])
}

export function trackRecent(item: Omit<SavedItem, 'savedAt'>) {
  const all = getRecentItems().filter((x) => !(x.type === item.type && x.id === item.id))
  const next = [{ ...item, savedAt: Date.now() }, ...all].slice(0, MAX_RECENT)
  writeJson(RECENT_KEY, next)
}

export function isCoachDismissed(module: string): boolean {
  return localStorage.getItem(`${COACH_PREFIX}${module}`) === '1'
}

export function dismissCoach(module: string) {
  localStorage.setItem(`${COACH_PREFIX}${module}`, '1')
  window.dispatchEvent(new Event('agri-ux-update'))
}

export function getNotifications(): NotificationItem[] {
  return readJson<NotificationItem[]>(NOTIF_KEY, [])
}

export function pushNotification(message: string, link?: string) {
  const all = getNotifications()
  const next: NotificationItem[] = [{
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    message,
    link,
    createdAt: Date.now(),
    read: false,
  }, ...all].slice(0, MAX_NOTIFS)
  writeJson(NOTIF_KEY, next)
}

export function markNotificationsRead() {
  const next = getNotifications().map((item) => ({ ...item, read: true }))
  writeJson(NOTIF_KEY, next)
}
