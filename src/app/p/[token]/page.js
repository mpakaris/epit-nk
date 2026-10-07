import DiaryEntryCard from './DiaryEntryCard';

export default async function PublicDiaryPage({ params }) {
  const { token } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/diary/share/resolve?token=${token}`, { cache: 'no-store' });
  const data = await res.json();

  if (!res.ok) {
    const expired = data.error === 'expired_token';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: '2rem' }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.5rem' }}>
            {expired ? 'A link lejárt' : 'Érvénytelen link'}
          </h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {expired
              ? 'Ez a megosztási link lejárt. Kérjen új linket a projekt adminisztrátorától.'
              : 'Ez a megosztási link nem érvényes vagy már nem létezik.'}
          </p>
        </div>
      </div>
    );
  }

  const { project, entries, token_label } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '1rem 1.25rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Projekt Napló {token_label ? `· ${token_label}` : ''}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>{project.name}</h1>
          {project.description && (
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>{project.description}</p>
          )}
        </div>
      </div>

      {/* Entries */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.25rem' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📷</div>
            <p style={{ fontSize: '0.9rem' }}>Még nincs bejegyzés ebben a naplóban.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {entries.map(entry => (
              <DiaryEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e8e8e8', background: '#fff', padding: '1rem 1.25rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#aaa', fontSize: '0.775rem', margin: 0 }}>Megtekintés csak olvasásra — Epitünk</p>
      </div>
    </div>
  );
}
