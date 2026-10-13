'use client';

export default function ClientSelect({ id, value, onChange, clients = [], style }) {
  const collective = clients.filter(c => !c.is_personal_client);
  const personal   = clients.filter(c => c.is_personal_client);

  return (
    <select id={id} className="form-control" value={value} onChange={onChange} style={style}>
      <option value="">– Válasszon ügyfelet –</option>
      {collective.map(c => (
        <option key={c.id} value={c.id}>
          {c.name}{c.discount_percent > 0 ? ` (${c.discount_percent}% kedv.)` : ''}
        </option>
      ))}
      {personal.length > 0 && (
        <optgroup label="Személyes ügyfelek">
          {personal.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.personal_owner_name ? ` · ${c.personal_owner_name}` : ''}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
