import type { KeyboardEvent } from 'react'

interface ChatInputProps {
  value: string
  loading: boolean
  disabled: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export function ChatInput({
  value,
  loading,
  disabled,
  onChange,
  onSubmit,
}: ChatInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!loading && !disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <div className="chat-input">
      <textarea
        className="chat-input__field"
        placeholder="Ask base212 anything..."
        rows={1}
        value={value}
        disabled={loading}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="chat-input__send"
        disabled={loading || disabled || !value.trim()}
        onClick={onSubmit}
        aria-label="Send message"
      >
        {loading ? (
          <span className="chat-input__spinner" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4L12 20M12 4L6 10M12 4L18 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
