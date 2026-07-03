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
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}
