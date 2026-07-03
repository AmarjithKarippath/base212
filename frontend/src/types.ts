export interface RoleDefinition {
  id: string
  name: string
  category: string
  priority: number
  prompt: string
}

export interface RoleCatalog {
  roleSelection: {
    allowMultiple: boolean
    mergeInstruction: string
  }
  roles: RoleDefinition[]
}

export interface SelectedRole {
  id: string
  name: string
  category: string
}

export interface ChatResponse {
  reply: string
  model: string
  selected_roles: SelectedRole[]
  finish_reason: string | null
  usage: Record<string, number> | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  selectedRoles?: SelectedRole[]
}

export interface UserProfile {
  sub: string
  email: string | null
  name: string | null
  picture: string | null
  is_admin: boolean
}

export interface DailyCount {
  date: string
  count: number
}

export interface AdminStats {
  total_sessions: number
  visits_without_message: number
  total_queries: number
  total_users: number
  logins_by_date: DailyCount[]
  queries_by_date: DailyCount[]
  sessions_by_date: DailyCount[]
  visits_without_message_by_date: DailyCount[]
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}
