'use client';

import useMobile from '@/hooks/useMobile';
import NewSurveyDesktop from './NewSurveyDesktop';
import NewSurveyMobile from '../mobile/NewSurveyMobile';

export default function NewSurveyPage() {
  const isMobile = useMobile();
  if (isMobile) return <NewSurveyMobile />;
  return <NewSurveyDesktop />;
}
