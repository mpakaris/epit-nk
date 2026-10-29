'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Camera, Loader2 } from 'lucide-react';
import SectionMediaGrid from '@/components/SectionMediaGrid';
import { processMediaFile } from '@/lib/mediaGate';

export default function SectionPhotoZone({ quoteId, quoteSurveyId, quoteTitle, quoteClientId, section, onEntryCreated }) {
  const { createSurvey, createSurveyEntry, uploadSurveyMedia, updateQuote, updateQuoteSection, fetchSurveyMedia } = useApp();
  const [uploading, setUploading] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState('');
  const fileInputRef = React.useRef(null);

  if (quoteSurveyId && section.survey_entry_id) {
    return <SectionMediaGrid surveyId={quoteSurveyId} surveyEntryId={section.survey_entry_id} isLocked={false} />;
  }

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(processMediaFile));
    setUploading(true); setUploadErr('');
    try {
      let surveyId = quoteSurveyId;
      if (!surveyId) {
        const s = await createSurvey({ title: quoteTitle });
        surveyId = s.id;
        await updateQuote(quoteId, { survey_id: surveyId });
      }
      const entry = await createSurveyEntry(surveyId, { name: section.name, description: section.description || null, size_m2: section.size_m2 || null });
      await uploadSurveyMedia(surveyId, files, { entryId: entry.id, mediaType: 'photo' });
      if (section.id) await updateQuoteSection(quoteId, section.id, { survey_entry_id: entry.id });
      await fetchSurveyMedia(surveyId);
      onEntryCreated(section.id, surveyId, entry.id);
    } catch (err) { setUploadErr(err.message || 'Hiba'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Fotók (0)</span>
      {uploadErr && <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)', marginLeft: '0.5rem' }}>{uploadErr}</span>}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
        {uploading ? <><Loader2 size={12} className="animate-spin" />Feltöltés…</> : <><Camera size={12} /> Fotó hozzáadása</>}
      </button>
    </div>
  );
}
