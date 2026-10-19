'use client';

import React from 'react';
import { DemoProvider } from '@/context/DemoContext';
import DemoBanner from '@/components/demo/DemoBanner';

export default function DemoLayout({ children }) {
  return (
    <DemoProvider>
      <DemoBanner />
      {children}
    </DemoProvider>
  );
}
