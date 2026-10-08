import { redirect } from 'next/navigation';

export default async function AdminProjectDetailPage({ params }) {
  const { id } = await params;
  redirect(`/projektek/${id}`);
}
