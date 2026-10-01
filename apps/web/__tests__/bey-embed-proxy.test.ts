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
    expect(out).toContain('history.pushState')
    expect(out).not.toContain('Location.prototype')
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

  it('injects createBrowserRouter basename under the embed proxy path', () => {
    const js = 'let ol=useMemo(()=>createBrowserRouter(getRouterData(al)),[al]);'
    const out = rewriteBeyEmbedScript(js)
    expect(out).toContain('createBrowserRouter(getRouterData(al),{basename:"/bey-embed"})')
  })

  it('rewrites Firebase Auth hosts onto /bey-gapi and skips unauthorized-domain', () => {
    const js = [
      'apiHost:`identitytoolkit.googleapis.com`,tokenApiHost:`securetoken.googleapis.com`,apiScheme:`https`',
      'INSTALLATIONS_API_URL=`https://firebaseinstallations.googleapis.com/v1`',
      'DYNAMIC_CONFIG_URL=`https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig`',
      '_fail(Qc,`unauthorized-domain`)',
      'getCookieConfig=()=>{let Qc=`.bey.chat`;return isDev?{name:`__session_dev`,domain:Qc}:isStaging?{name:`__session_staging`,domain:Qc}:{name:`__session`,domain:Qc}}',
    ].join(';')
    const out = rewriteBeyEmbedScript(js)
    expect(out).toContain('apiHost:location.host+"/bey-gapi"+"/identitytoolkit"')
    expect(out).toContain('tokenApiHost:location.host+"/bey-gapi"+"/securetoken"')
    expect(out).toContain('INSTALLATIONS_API_URL=location.origin+"/bey-gapi"+"/firebaseinstallations/v1"')
    expect(out).toContain('DYNAMIC_CONFIG_URL=location.origin+"/bey-gapi"+"/firebase/v1alpha/projects/-/apps/{app-id}/webConfig"')
    expect(out).toContain('return')
    expect(out).not.toContain('unauthorized-domain')
    expect(out).toContain('getCookieConfig=()=>{let Qc=location.hostname;')
    expect(out).not.toContain('identitytoolkit.googleapis.com')
  })
})
