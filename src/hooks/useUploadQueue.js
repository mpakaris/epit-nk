'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_CONCURRENT = 2;

/**
 * Non-blocking file upload queue with local previews.
 * Files are shown as local previews immediately; uploads happen in background.
 * Max 2 concurrent uploads to respect poor mobile connections.
 *
 * @param {Function} uploadFn - async (rawFile, meta) => void — handles upload + state update
 * @returns {{ enqueue, queue, retry, retryAll, clear, totalPending, totalUploading, totalDone, totalError }}
 */
export function useUploadQueue({ uploadFn } = {}) {
  const [queue, setQueue] = useState([]);
  const activeRef   = useRef(new Set()); // IDs currently processing
  const uploadFnRef = useRef(uploadFn);
  uploadFnRef.current = uploadFn;

  const enqueue = useCallback((files, meta) => {
    const items = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      meta,
      status: 'pending',
      preview: URL.createObjectURL(file),
      errorMsg: null,
    }));
    setQueue(prev => [...prev, ...items]);
  }, []);

  useEffect(() => {
    const pending = queue.filter(i => i.status === 'pending');
    const active  = queue.filter(i => i.status === 'uploading').length;
    if (!pending.length || active >= MAX_CONCURRENT) return;

    const toStart = pending.slice(0, MAX_CONCURRENT - active);

    toStart.forEach(item => {
      if (activeRef.current.has(item.id)) return;
      activeRef.current.add(item.id);

      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

      uploadFnRef.current(item.file, item.meta)
        .then(() => {
          activeRef.current.delete(item.id);
          setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done' } : i));
        })
        .catch(err => {
          activeRef.current.delete(item.id);
          setQueue(prev => prev.map(i => i.id === item.id
            ? { ...i, status: 'error', errorMsg: err.message || 'Feltöltési hiba' }
            : i
          ));
        });
    });
  }, [queue]);

  const retry = useCallback((id) => {
    activeRef.current.delete(id);
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'pending', errorMsg: null } : i));
  }, []);

  const retryAll = useCallback(() => {
    activeRef.current.clear();
    setQueue(prev => prev.map(i => i.status === 'error' ? { ...i, status: 'pending', errorMsg: null } : i));
  }, []);

  const clear = useCallback(() => {
    setQueue(prev => {
      prev.forEach(i => { try { URL.revokeObjectURL(i.preview); } catch {} });
      return [];
    });
    activeRef.current.clear();
  }, []);

  const totalPending   = queue.filter(i => i.status === 'pending').length;
  const totalUploading = queue.filter(i => i.status === 'uploading').length;
  const totalDone      = queue.filter(i => i.status === 'done').length;
  const totalError     = queue.filter(i => i.status === 'error').length;

  return { enqueue, queue, retry, retryAll, clear, totalPending, totalUploading, totalDone, totalError };
}
