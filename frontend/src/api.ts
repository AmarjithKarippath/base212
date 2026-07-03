import type { AdminStats, ChatHistoryItem, ChatResponse, RoleCatalog, UserProfile } from './types'

const API_BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        detail = body.detail
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function fetchRoles(): Promise<RoleCatalog> {
  return request<RoleCatalog>('/roles')
}

export function fetchMe(): Promise<UserProfile | null> {
  return request<UserProfile | null>('/auth/me')
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}

export async function downloadUsersCsv(): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/export`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to download users CSV')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'base212-users.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function recordVisit(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/analytics/visit', { method: 'POST' })
}

export function fetchAdminStats(): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats')
}

export function sendChat(
  message: string,
  roleIds: string[],
  history: ChatHistoryItem[],
): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, role_ids: roleIds, history }),
  })
}

export function startGoogleLogin(popup = false) {
  const url = popup
    ? `${API_BASE}/auth/google/login?popup=true`
    : `${API_BASE}/auth/google/login`

  if (popup) {
    window.open(url, 'base212-google-login', 'width=520,height=680')
    return
  }

  window.location.href = url
}
