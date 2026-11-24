'use client';

import useMobile from '@/hooks/useMobile';
import ProjectsListClient from './ProjectsListClient';
import ProjectsListDesktop from './desktop/ProjectsListDesktop';

export default function ProjectsListPage() {
  const isMobile = useMobile();
  if (isMobile) return <ProjectsListClient />;
  return <ProjectsListDesktop />;
}
