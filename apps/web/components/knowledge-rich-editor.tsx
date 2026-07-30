'use client'

import React, { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { toKnowledgeHtml } from '../lib/project-knowledge'

type KnowledgeRichEditorProps = {
  content: string
  editable: boolean
  disabled?: boolean
  ariaLabel: string
  placeholder?: string
  onChange: (html: string) => void
  onBlur?: () => void
  onRequestEdit?: () => void
  onEscape?: () => void
  onSaveShortcut?: () => void
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={['audion-knowledge-toolbar-btn', active ? 'is-active' : '']
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function KnowledgeRichEditor({
  content,
  editable,
  disabled,
  ariaLabel,
  placeholder = 'Write the briefing for this chapter…',
  onChange,
  onBlur,
  onRequestEdit,
  onEscape,
  onSaveShortcut,
}: KnowledgeRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toKnowledgeHtml(content) || '',
    editable: editable && !disabled,
    editorProps: {
      attributes: {
        class: 'audion-knowledge-prose',
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          onEscape?.()
          return true
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          onSaveShortcut?.()
          return true
        }
        return false
      },
      handleDOMEvents: {
        blur: () => {
          onBlur?.()
          return false
        },
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable && !disabled)
  }, [editor, editable, disabled])

  useEffect(() => {
    if (!editor || editable) return
    const next = toKnowledgeHtml(content) || ''
    const current = editor.getHTML()
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, content, editable])

  useEffect(() => {
    if (!editor || !editable) return
    editor.commands.focus('end')
  }, [editor, editable])

  if (!editor) return null

  return (
    <div
      className={[
        'audion-knowledge-rich',
        editable ? 'is-editable' : 'is-readonly',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {editable ? (
        <div className="audion-knowledge-toolbar" role="toolbar" aria-label="Formatting">
          <ToolbarButton
            label="Bold"
            active={editor.isActive('bold')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic"
            active={editor.isActive('italic')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="H2"
            active={editor.isActive('heading', { level: 2 })}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="List"
            active={editor.isActive('bulletList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Numbers"
            active={editor.isActive('orderedList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </div>
      ) : null}

      <div
        className="audion-knowledge-rich-surface"
        onClick={() => {
          if (!editable && !disabled) onRequestEdit?.()
        }}
      >
        <EditorContent editor={editor} />
        {!editable && editor.isEmpty ? (
          <span className="audion-knowledge-placeholder audion-knowledge-placeholder--overlay">
            Click to write this chapter…
          </span>
        ) : null}
      </div>
    </div>
  )
}
