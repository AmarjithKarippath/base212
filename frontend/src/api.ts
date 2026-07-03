import type { ChatResponse, RoleCatalog } from './types'

const API_BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
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

  return response.json() as Promise<T>
}

export function fetchRoles(): Promise<RoleCatalog> {
  return request<RoleCatalog>('/roles')
}

export function sendChat(message: string, roleIds: string[]): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, role_ids: roleIds }),
  })
}
