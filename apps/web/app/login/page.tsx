import { LoginPageClient } from '../../components/login-page'
import { isPlexonAuthConfigured } from '../../lib/plexon-auth'

export default function LoginPage() {
  return (
    <main className="audion-login">
      <LoginPageClient plexonConfigured={isPlexonAuthConfigured()} />
    </main>
  )
}
