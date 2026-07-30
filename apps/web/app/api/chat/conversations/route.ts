import { NextResponse } from 'next/server'
import { storeChatConversationList } from '../../../../lib/fixtures/chat-store'

export async function GET() {
  return NextResponse.json(storeChatConversationList())
}
