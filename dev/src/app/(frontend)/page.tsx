import Link from 'next/link'

const HomePage = () => {
  return (
    <main
      style={{
        display: 'grid',
        gap: '1rem',
        margin: '0 auto',
        maxWidth: '48rem',
        minHeight: '100vh',
        padding: '4rem 1.5rem',
      }}
    >
      <div>
        <h1>Payload Table Field Dev Harness</h1>
        <p>
          This Next.js app mounts Payload 3 locally so the migrated table field can be tested in the
          real admin UI.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/admin">Open Payload Admin</Link>
        <Link href="/api/examples">Open REST API</Link>
      </div>
    </main>
  )
}

export default HomePage
