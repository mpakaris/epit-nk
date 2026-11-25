'use client';

/**
 * Consistent media thumbnail for images and videos.
 * - Images: shows thumbnail_url / cdn_url / drive_view_url as cover image
 * - Videos: black background + white play icon (no thumbnail generated server-side)
 *
 * Props:
 *   item     — object with mime_type, thumbnail_url, cdn_url, drive_view_url, file_name
 *   size     — optional width/height shorthand (number, applied as both; default fills container)
 *   radius   — border-radius (default 8)
 *   style    — extra style on the wrapper div
 *   onClick  — click handler
 */
export default function MediaThumb({ item, size, radius = 8, style, onClick }) {
  const isVideo = item?.mime_type?.startsWith('video/');
  const thumb   = item?.thumbnail_url || item?.cdn_url || item?.drive_view_url;
  const hasThumb = !isVideo && !!thumb;

  const base = {
    width:          size ?? '100%',
    height:         size ?? '100%',
    borderRadius:   radius,
    overflow:       'hidden',
    flexShrink:     0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     hasThumb ? `url(${thumb}) center/cover no-repeat` : '#0D0F13',
    cursor:         onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <div style={base} onClick={onClick} aria-label={item?.file_name || undefined}>
      {isVideo && (
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Play triangle */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      )}
      {!hasThumb && !isVideo && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
      )}
    </div>
  );
}
