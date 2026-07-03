import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'
import { normalizeMarkdown } from '../utils/markdown'

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`message message--${message.role}`}
        >
          <div className="message__avatar">
            {message.role === 'user' ? 'You' : '212'}
          </div>
          <div className="message__body">
            {message.role === 'assistant' && message.selectedRoles?.length ? (
              <div className="message__roles">
                {message.selectedRoles.map((role) => (
                  <span key={role.id} className="message__role-tag">
                    {role.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="message__content">
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="table-wrap">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {normalizeMarkdown(message.content)}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
