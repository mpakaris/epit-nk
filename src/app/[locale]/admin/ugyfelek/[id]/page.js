import { redirect } from 'next/navigation';
export default async function LegacyUgyfelekDetailRedirect({ params }) {
  const { id } = await params;
  redirect(`/ugyfelek/${id}`);
}
