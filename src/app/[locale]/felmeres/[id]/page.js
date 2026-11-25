'use client';

import useMobile from '@/hooks/useMobile';
import SurveyDetailMobile from '../mobile/SurveyDetailMobile';
import SurveyDetailDesktop from './desktop/SurveyDetailDesktop';

export default function SurveyDetailPage() {
  const isMobile = useMobile();
  if (isMobile) return <SurveyDetailMobile />;
  return <SurveyDetailDesktop />;
}
