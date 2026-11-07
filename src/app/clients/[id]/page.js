import { permanentRedirect } from 'next/navigation';

// Retired in CP-02 — all client-facing traffic now goes through /portal (authenticated OTP flow)
export default function ClientPortalPage() {
  permanentRedirect('/portal');
}
