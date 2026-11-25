'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  loadCollectivesData, createCollective, renameCollective, deleteCollective,
  inviteMember, retractInvitation, respondToInvitation, updateMember, respondToTransfer,
} from '@/lib/collectivesService';

export function useCollectives() {
  const { dataReady, refreshCollectives, refreshSupabaseData } = useApp();

  const [collectives,      setCollectives]      = useState([]);
  const [myInvitations,    setMyInvitations]    = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [fetching,         setFetching]         = useState(true);
  const [fetchError,       setFetchError]       = useState(null);

  async function refresh() {
    setFetching(true);
    setFetchError(null);
    try {
      const { colData, invData, myInvData, transferData } = await loadCollectivesData();

      const pendingBy  = {};
      const declinedBy = {};
      for (const inv of (invData.invitations || [])) {
        if (inv.status === 'pending') {
          if (!pendingBy[inv.collective_id])  pendingBy[inv.collective_id]  = [];
          pendingBy[inv.collective_id].push(inv);
        } else if (inv.status === 'declined') {
          if (!declinedBy[inv.collective_id]) declinedBy[inv.collective_id] = [];
          declinedBy[inv.collective_id].push(inv);
        }
      }

      setCollectives((colData.collectives || []).map(c => ({
        ...c,
        pending_invitations:  pendingBy[c.id]  || [],
        declined_invitations: declinedBy[c.id] || [],
      })));
      setMyInvitations(myInvData.invitations || []);
      setTransferRequests(transferData.requests || []);
    } catch {
      setFetchError('Hálózati hiba');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { if (dataReady) refresh(); }, [dataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = {
    async create(name) {
      const result = await createCollective(name);
      if (result.ok) { await refresh(); refreshCollectives(); }
      return result;
    },

    async rename(id, name) {
      const result = await renameCollective(id, name);
      if (result.ok) { await refresh(); refreshCollectives(); }
      return result;
    },

    async remove(id, transferDocs = false) {
      const result = await deleteCollective(id, transferDocs);
      if (result.ok) { await refresh(); refreshCollectives(); }
      return result;
    },

    async invite(collectiveId, email) {
      const result = await inviteMember(collectiveId, email);
      if (result.ok) await refresh();
      return result;
    },

    async retract(invitationId) {
      const result = await retractInvitation(invitationId);
      if (result.ok) await refresh();
      return result;
    },

    async reInvite(collectiveId, email) {
      const result = await inviteMember(collectiveId, email);
      if (result.ok) await refresh();
      return result;
    },

    async respondInvitation(inv, action) {
      const result = await respondToInvitation(inv.token, action);
      if (result.ok) {
        setMyInvitations(prev => prev.filter(i => i.id !== inv.id));
        if (action === 'accept') { await refresh(); refreshCollectives(); }
      }
      return result;
    },

    async manageMember(collectiveId, userId, action) {
      const result = await updateMember(collectiveId, userId, action);
      if (result.ok) await refresh();
      return result;
    },

    async respondTransfer(req, action) {
      const result = await respondToTransfer(req.id, action);
      if (result.ok) {
        setTransferRequests(prev => prev.filter(r => r.id !== req.id));
        if (action === 'accept') refreshSupabaseData();
        await refresh();
      }
      return result;
    },
  };

  return { collectives, myInvitations, transferRequests, fetching, fetchError, refresh, actions };
}
