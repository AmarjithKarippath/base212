import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const hasMessages = messages.length > 0

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
        <div className="chat-view__messages">
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
        <RoleSelector
          roles={roles}
          selectedIds={selectedRoleIds}
          allowMultiple={allowMultiple}
          onChange={onRoleChange}
        />
        <ChatInput
          value={input}
          loading={loading}
          disabled={selectedRoleIds.length === 0}
          onChange={onInputChange}
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
