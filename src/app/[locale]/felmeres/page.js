'use client';

import useMobile from '@/hooks/useMobile';
import SurveyListDesktop from './SurveyListDesktop';
import SurveyListMobile from './mobile/SurveyListMobile';

export default function SurveyListPage() {
  const isMobile = useMobile();
  if (isMobile) return <SurveyListMobile />;
  return <SurveyListDesktop />;
}
