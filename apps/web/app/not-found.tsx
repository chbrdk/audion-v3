import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: '#0f1114', color: '#f4f6f8' }}>
      <div style={{ display: 'grid', gap: '1rem', textAlign: 'center' }}>
        <h1>Persona route not found</h1>
        <p>The requested AUDION v3 slice could not be found.</p>
        <Link href="/personas">Back to personas</Link>
      </div>
    </main>
  )
}
