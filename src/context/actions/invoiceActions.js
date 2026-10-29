import { canMutateEntry } from '@/lib/permissions';

export function makeInvoiceActions({
  invoices, projects, setInvoices,
  uid, isAdmin, collectives, effectiveUser, supabase,
}) {
  const uploadInvoiceImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${effectiveUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await supabase.storage.from('invoices').upload(fileName, file);
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from('invoices').getPublicUrl(data.path);
    return { imageUrl: publicUrlData.publicUrl, storagePath: data.path };
  };

  const createInvoice = async ({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue, roomId, aiLineItems, aiTotal }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue, roomId, aiLineItems, aiTotal }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a számla mentésekor');
    setInvoices(prev => [json.invoice, ...prev]);
    return json.invoice;
  };

  const updateInvoice = async (invoiceId, fields) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    const proj    = invoice ? projects.find(p => p.id === invoice.project_id) : null;
    if (proj) {
      if (!canMutateEntry({ doc: proj, entry: invoice, uid, isAdmin, collectives }))
        throw new Error('Nincs jogosultsága!');
    }
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a módosításkor');
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? json.invoice : inv));
    return json.invoice;
  };

  const deleteInvoice = async (invoiceId) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    const proj    = invoice ? projects.find(p => p.id === invoice.project_id) : null;
    if (proj) {
      if (!canMutateEntry({ doc: proj, entry: invoice, uid, isAdmin, collectives }))
        throw new Error('Nincs jogosultsága!');
    }
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a törléskor');
    const now = new Date().toISOString();
    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, deleted_at: now } : inv
    ));
  };

  return { uploadInvoiceImage, createInvoice, updateInvoice, deleteInvoice };
}
