export async function loadCollectivesData() {
  const [colRes, invRes, myInvRes, transferRes] = await Promise.all([
    fetch('/api/collectives', { cache: 'no-store' }),
    fetch('/api/collectives/invitations', { cache: 'no-store' }),
    fetch('/api/collectives/my-invitations', { cache: 'no-store' }),
    fetch('/api/transfer-requests', { cache: 'no-store' }),
  ]);
  return {
    colData:      colRes.ok      ? await colRes.json()      : { collectives: [] },
    invData:      invRes.ok      ? await invRes.json()      : { invitations: [] },
    myInvData:    myInvRes.ok    ? await myInvRes.json()    : { invitations: [] },
    transferData: transferRes.ok ? await transferRes.json() : { requests: [] },
  };
}

export async function createCollective(name) {
  const res = await fetch('/api/collectives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function renameCollective(id, name) {
  const res = await fetch(`/api/collectives/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function deleteCollective(id, transferDocs = false) {
  const res = await fetch(`/api/collectives/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transfer_docs: transferDocs }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function inviteMember(collectiveId, email) {
  const res = await fetch(`/api/collectives/${collectiveId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function retractInvitation(invitationId) {
  const res = await fetch(`/api/collectives/invitations/${invitationId}`, { method: 'DELETE' });
  return { ok: res.ok, data: await res.json() };
}

export async function respondToInvitation(token, action) {
  const res = await fetch(`/api/invitations/${token}/${action}`, { method: 'POST' });
  return { ok: res.ok, data: await res.json() };
}

export async function updateMember(collectiveId, userId, action) {
  if (action === 'remove') {
    const res = await fetch(`/api/collectives/${collectiveId}/members/${userId}`, { method: 'DELETE' });
    return { ok: res.ok, data: await res.json() };
  }
  const res = await fetch(`/api/collectives/${collectiveId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function respondToTransfer(requestId, action) {
  const res = await fetch(`/api/transfer-requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return { ok: res.ok, data: await res.json() };
}

export const TIER_DISPLAY = {
  // new short codes (from migration 159)
  xs: { seats: 1,    price: null },
  s:  { seats: 3,    price: '4.500 Ft' },
  m:  { seats: 6,    price: '9.000 Ft' },
  l:  { seats: 9,    price: '13.500 Ft' },
  xl: { seats: null, price: null },
  // legacy codes — kept for backward compat during rollout
  small:      { seats: 3,    price: '4.500 Ft' },
  medium:     { seats: 6,    price: '9.000 Ft' },
  large:      { seats: 9,    price: '13.500 Ft' },
  enterprise: { seats: null, price: null },
};
