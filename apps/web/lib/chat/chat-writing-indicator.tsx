/** TTFT wait — DS `.chat-thinking-live` dots + writing label (chat.css). */
export function ChatWritingIndicator({ label }: { label: string }) {
  return (
    <div className="chat-thinking chat-thinking-live" role="status" aria-live="polite">
      <span className="chat-thinking-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <div className="chat-thinking-copy">
        <span className="chat-thinking-label">{label}</span>
      </div>
    </div>
  )
}
