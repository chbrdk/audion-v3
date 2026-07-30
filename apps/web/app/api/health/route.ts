import { NextResponse } from 'next/server'
import { hasOpenAiApiKey } from '../../../lib/ai/client'
import { paths } from '../../../lib/paths'
import {
  getAiRuntime,
  shouldPreferAiNative,
} from '../../../lib/runtime-config'

/** Coolify / Traefik health probe — no auth. */
export async function GET() {
  const aiRuntime = getAiRuntime()
  const openaiConfigured = hasOpenAiApiKey()
  return NextResponse.json({
    ok: true,
    service: 'audion-v3',
    login: paths.routes.login,
    ai: {
      runtime: aiRuntime,
      openaiConfigured,
      chatNative: shouldPreferAiNative(),
      hint: shouldPreferAiNative()
        ? 'Chat + AI workflows use native OpenAI'
        : `Chat is stub — set ${paths.envOpenAiApiKey} and ${paths.envAiRuntime}=auto|native, then redeploy`,
    },
  })
}
