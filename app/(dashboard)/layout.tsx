import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import DashboardLayoutClient from './DashboardLayoutClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DSR CMS',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <DashboardLayoutClient
      user={{
        name: user.name,
        role: user.role,
        hasWriteAccess: user.hasWriteAccess,
        slug: user.slug,
      }}
    >
      {children}
    </DashboardLayoutClient>
  );
}
