import { useCallback, useEffect, useState } from 'react'
import { fetchMe, fetchRoles, logout, sendChat, startGoogleLogin } from './api'
import { ChatView } from './components/ChatView'
import { LoginModal } from './components/LoginModal'
import type { ChatMessage, RoleDefinition, UserProfile } from './types'
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
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<'second-chat' | 'manual'>('manual')

  useEffect(() => {
    Promise.all([fetchRoles(), fetchMe()])
      .then(([catalog, profile]) => {
        setRoles(catalog.roles)
        setAllowMultiple(catalog.roleSelection.allowMultiple)
        if (catalog.roles.length > 0) {
          setSelectedRoleIds([catalog.roles[0].id])
        }
        setUser(profile)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBootstrapping(false))
  }, [])

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      if (event.data?.type === 'auth-success') {
        fetchMe()
          .then(setUser)
          .catch(() => setUser(null))
        setLoginModalOpen(false)
      }
    }

    window.addEventListener('message', handleAuthMessage)
    return () => window.removeEventListener('message', handleAuthMessage)
  }, [])

  const openLoginModal = useCallback((reason: 'second-chat' | 'manual') => {
    setLoginReason(reason)
    setLoginModalOpen(true)
  }, [])

  const handleGoogleLogin = useCallback(() => {
    startGoogleLogin(loginReason === 'second-chat')
  }, [loginReason])

  const handleSignOut = useCallback(async () => {
    try {
      await logout()
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    const message = input.trim()
    if (!message || loading || selectedRoleIds.length === 0) {
      return
    }

    const userMessageCount = messages.filter((item) => item.role === 'user').length
    if (userMessageCount >= 1 && !user) {
      openLoginModal('second-chat')
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

    const history = messages.map(({ role, content }) => ({ role, content }))

    try {
      const response = await sendChat(message, selectedRoleIds, history)
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
  }, [input, loading, messages, openLoginModal, selectedRoleIds, user])

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
        user={user}
        onInputChange={setInput}
        onRoleChange={setSelectedRoleIds}
        onSubmit={handleSubmit}
        onSignIn={() => startGoogleLogin(false)}
        onSignOut={handleSignOut}
      />
      <LoginModal
        open={loginModalOpen}
        reason={loginReason}
        onClose={() => setLoginModalOpen(false)}
        onGoogleLogin={handleGoogleLogin}
      />
    </div>
  )
}
