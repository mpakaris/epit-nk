export function makeClientActions({ clients, setClients, uid, isAdmin }) {
  const createClient = async ({ name, address, phone, email, notes, discountPercent = 0, companyName, taxNumber, gdprConsent, collectiveShares = [], sharesGdprConfirmed = false }) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, email, notes, discountPercent, companyName, taxNumber, gdprConsent, collectiveShares, sharesGdprConfirmed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél létrehozásakor');
    setClients(prev => [...prev, data.client].sort((a, b) => a.name.localeCompare(b.name, 'hu')));
    return data.client;
  };

  const updateClient = async (clientId, fields) => {
    const client = clients.find(c => c.id === clientId);
    if (!isAdmin && client?.owner_id !== uid) throw new Error('Csak adminisztrátor vagy az ügyfél tulajdonosa módosíthat!');
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél módosításakor');
    setClients(prev => prev.map(c => c.id === clientId ? data.client : c).sort((a, b) => a.name.localeCompare(b.name, 'hu')));
    return data.client;
  };

  const deleteClient = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!isAdmin && client?.owner_id !== uid) throw new Error('Csak adminisztrátor vagy az ügyfél tulajdonosa törölhet!');
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél törlésekor');
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  return { createClient, updateClient, deleteClient };
}
