'use client';

import useMobile from '@/hooks/useMobile';
import ProjectsListDesktop from '@/app/[locale]/projektek/desktop/ProjectsListDesktop';
import ProjectsListClient from '@/app/[locale]/projektek/ProjectsListClient';

export default function DemoProjectsPage() {
  const isMobile = useMobile();
  if (isMobile) return <ProjectsListClient />;
  return <ProjectsListDesktop />;
}
