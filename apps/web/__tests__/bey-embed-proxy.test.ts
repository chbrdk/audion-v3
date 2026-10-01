import { afterEach, describe, expect, it } from 'vitest'
import {
  beyChatEmbedUrl,
  isBeyEmbedProxyEnabled,
  rewriteBeyEmbedHtml,
  rewriteBeyEmbedScript,
} from '../lib/bey/embed-proxy'
import { paths } from '../lib/paths'

describe('bey embed proxy helpers', () => {
  afterEach(() => {
    delete process.env[paths.envBeyEmbedProxy]
  })

  it('defaults proxy on', () => {
    expect(isBeyEmbedProxyEnabled()).toBe(true)
    expect(beyChatEmbedUrl('abc-123')).toBe('/bey-embed/abc-123')
  })

  it('disables proxy via env', () => {
    process.env[paths.envBeyEmbedProxy] = 'false'
    expect(isBeyEmbedProxyEnabled()).toBe(false)
    expect(beyChatEmbedUrl('abc-123')).toBe('https://bey.chat/abc-123')
  })

  it('rewrites HTML absolute paths under the proxy prefix', () => {
    const html = `<!doctype html><html><head></head><body>
      <link href="/assets/icon.svg" />
      <script src="/assets/index.js"></script>
      <a href="https://bey.chat/foo">x</a>
    </body></html>`
    const out = rewriteBeyEmbedHtml(html)
    expect(out).toContain('href="/bey-embed/assets/icon.svg"')
    expect(out).toContain('src="/bey-embed/assets/index.js"')
    expect(out).toContain('href="/bey-embed/foo"')
    expect(out).toContain('<base href="/bey-embed/"')
    expect(out).toContain('Location.prototype')
    expect(out).toContain('/bey-embed')
    expect(out).not.toContain('https://bey.chat')
  })

  it('rewrites SPA JS api.bey.chat hosts onto /bey-api', () => {
    const js =
      'const base=isStaging?`https://api-staging.bey.chat`:`https://api.bey.chat`; fetch("https://bey.chat/x")'
    const out = rewriteBeyEmbedScript(js)
    expect(out).toContain('`/bey-api`')
    expect(out).toContain('"/bey-embed/x"')
    expect(out).not.toContain('api.bey.chat')
    expect(out).not.toContain('https://bey.chat')
  })
})
