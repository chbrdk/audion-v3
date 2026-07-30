import { NextResponse } from 'next/server'
import { getSettingsProviders } from '../../../../lib/settings-admin'

export async function GET() {
  return NextResponse.json(getSettingsProviders())
}
