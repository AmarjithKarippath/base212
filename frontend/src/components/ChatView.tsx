import type { KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, RoleDefinition } from '../types'
import { AppHeader } from './AppHeader'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { RoleSelector } from './RoleSelector'

interface ChatViewProps {
  messages: ChatMessage[]
  roles: RoleDefinition[]
  selectedRoleIds: string[]
  allowMultiple: boolean
  input: string
  loading: boolean
  error: string | null
  onInputChange: (value: string) => void
  onRoleChange: (ids: string[]) => void
  onSubmit: () => void
}

export function ChatView({
  messages,
  roles,
  selectedRoleIds,
  allowMultiple,
  input,
  loading,
  error,
  onInputChange,
  onRoleChange,
  onSubmit,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const programmaticScroll = useRef(false)
  const [teamVisible, setTeamVisible] = useState(true)

  const hasMessages = messages.length > 0

  useEffect(() => {
    programmaticScroll.current = true
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

    const timer = window.setTimeout(() => {
      programmaticScroll.current = false
    }, 450)

    return () => window.clearTimeout(timer)
  }, [messages, loading])

  useEffect(() => {
    const container = messagesRef.current
    if (!container || !hasMessages) {
      return
    }

    const handleScroll = () => {
      if (programmaticScroll.current) {
        return
      }
      setTeamVisible(false)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMessages])

  useEffect(() => {
    if (!hasMessages) {
      setTeamVisible(true)
    }
  }, [hasMessages])

  const handleInputChange = (value: string) => {
    onInputChange(value)
    if (value.length > 0) {
      setTeamVisible(true)
    }
  }

  const handleInputFocus = () => {
    if (hasMessages) {
      setTeamVisible(true)
    }
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (hasMessages && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      setTeamVisible(true)
    }
  }

  const teamCollapsed = hasMessages && !teamVisible

  return (
    <div className={`chat-view ${hasMessages ? 'chat-view--active' : ''}`}>
      <AppHeader />

      {!hasMessages ? (
        <header className="hero">
          <h1 className="hero__title">Turn your ideas into action</h1>
          <p className="hero__subtitle">
            base212 lets you build smarter decisions in minutes with your AI team.
            Pick roles, ask a question, and get a combined expert response.
          </p>
        </header>
      ) : (
        <div className="chat-view__messages" ref={messagesRef}>
          <MessageList messages={messages} />
          {loading ? (
            <div className="message message--assistant message--typing">
              <div className="message__avatar">212</div>
              <div className="message__body">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-panel">
        <div
          className={`role-selector-wrap ${teamCollapsed ? 'role-selector-wrap--collapsed' : ''}`}
          aria-hidden={teamCollapsed}
        >
          <div className="role-selector-wrap__inner">
            <RoleSelector
              roles={roles}
              selectedIds={selectedRoleIds}
              allowMultiple={allowMultiple}
              onChange={onRoleChange}
            />
          </div>
        </div>
        <ChatInput
          value={input}
          loading={loading}
          disabled={selectedRoleIds.length === 0}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          onSubmit={onSubmit}
        />
        {error ? <p className="chat-panel__error">{error}</p> : null}
        {selectedRoleIds.length === 0 ? (
          <p className="chat-panel__hint">Select at least one role to start.</p>
        ) : null}
      </div>
    </div>
  )
}
