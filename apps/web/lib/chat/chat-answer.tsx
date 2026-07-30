import { useMemo, type ReactNode } from 'react'
import { Button } from '@msqdx/ui'
import {
  parseChatBlocks,
  type ChatBlock,
  type ChatInline,
} from './format-chat-answer'

type Props = {
  answer: string
  activeN?: number | null
  citationCount?: number
  onCiteClick?: (n: number) => void
}

function renderInlines(
  inlines: ChatInline[],
  citationCount: number,
  activeN: number | null,
  onCiteClick: ((n: number) => void) | undefined,
  keyPrefix: string,
): ReactNode[] {
  return inlines.map((seg, i) => {
    const key = `${keyPrefix}-${i}`
    if (seg.type === 'text') return <span key={key}>{seg.value}</span>
    if (seg.type === 'strong') return <strong key={key}>{seg.value}</strong>
    if (seg.type === 'em') return <em key={key}>{seg.value}</em>
    const inRange = seg.n >= 1 && seg.n <= citationCount
    if (!inRange || !onCiteClick) return <span key={key}>[{seg.n}]</span>
    const active = activeN === seg.n
    return (
      <Button
        key={key}
        type="button"
        variant="link"
        size="sm"
        className={`answer-cite${active ? ' is-active' : ''}`}
        aria-label={`Citation ${seg.n}`}
        onClick={() => onCiteClick(seg.n)}
      >
        [{seg.n}]
      </Button>
    )
  })
}

function BlockView({
  block,
  index,
  citationCount,
  activeN,
  onCiteClick,
}: {
  block: ChatBlock
  index: number
  citationCount: number
  activeN: number | null
  onCiteClick?: (n: number) => void
}) {
  const prefix = `b${index}`
  if (block.type === 'h') {
    const Tag = block.level === 3 ? 'h4' : 'h3'
    return (
      <Tag className={`chat-answer-h chat-answer-h${block.level}`}>
        {renderInlines(block.inlines, citationCount, activeN, onCiteClick, prefix)}
      </Tag>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol className="chat-answer-ol">
        {block.items.map((item, j) => (
          <li key={`${prefix}-li-${j}`}>
            {renderInlines(item, citationCount, activeN, onCiteClick, `${prefix}-li-${j}`)}
          </li>
        ))}
      </ol>
    )
  }
  if (block.type === 'ul') {
    return (
      <ul className="chat-answer-ul">
        {block.items.map((item, j) => (
          <li key={`${prefix}-li-${j}`}>
            {renderInlines(item, citationCount, activeN, onCiteClick, `${prefix}-li-${j}`)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p className="chat-answer-p">
      {renderInlines(block.inlines, citationCount, activeN, onCiteClick, prefix)}
    </p>
  )
}

/** Formatted assistant answer — ported from ECHON chat chrome. */
export function ChatAnswer({
  answer,
  activeN = null,
  citationCount = 0,
  onCiteClick,
}: Props) {
  const blocks = useMemo(() => parseChatBlocks(answer), [answer])

  return (
    <div className="chat-answer reveal" role="article" aria-label="Assistant answer">
      {blocks.map((block, i) => (
        <BlockView
          key={`block-${i}`}
          block={block}
          index={i}
          citationCount={citationCount}
          activeN={activeN}
          onCiteClick={onCiteClick}
        />
      ))}
    </div>
  )
}
