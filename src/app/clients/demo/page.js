import { permanentRedirect } from 'next/navigation';

// Retired in CP-02 — all client-facing traffic now goes through /portal
export default function DemoClientPortalPage() {
  permanentRedirect('/portal');
}
