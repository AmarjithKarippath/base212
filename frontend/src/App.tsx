import { useCallback, useEffect, useState } from 'react'
import { fetchRoles, sendChat } from './api'
import { ChatView } from './components/ChatView'
import type { ChatMessage, RoleDefinition } from './types'
import './App.css'

function createId() {
  return crypto.randomUUID()
}

export default function App() {
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [allowMultiple, setAllowMultiple] = useState(true)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    fetchRoles()
      .then((catalog) => {
        setRoles(catalog.roles)
        setAllowMultiple(catalog.roleSelection.allowMultiple)
        if (catalog.roles.length > 0) {
          setSelectedRoleIds([catalog.roles[0].id])
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBootstrapping(false))
  }, [])

  const handleSubmit = useCallback(async () => {
    const message = input.trim()
    if (!message || loading || selectedRoleIds.length === 0) {
      return
    }

    setError(null)
    setLoading(true)
    setInput('')

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: message,
    }
    setMessages((current) => [...current, userMessage])

    try {
      const response = await sendChat(message, selectedRoleIds)
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: response.reply,
          selectedRoles: response.selected_roles,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [input, loading, selectedRoleIds])

  if (bootstrapping) {
    return (
      <div className="app app--loading">
        <div className="loader">Loading base212...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <ChatView
        messages={messages}
        roles={roles}
        selectedRoleIds={selectedRoleIds}
        allowMultiple={allowMultiple}
        input={input}
        loading={loading}
        error={error}
        onInputChange={setInput}
        onRoleChange={setSelectedRoleIds}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
