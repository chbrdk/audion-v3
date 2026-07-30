import { NextResponse } from 'next/server'
import { storeChatConversationDetail } from '../../../../../lib/fixtures/chat-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params
  const conversation = storeChatConversationDetail(conversationId)
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(conversation)
}
