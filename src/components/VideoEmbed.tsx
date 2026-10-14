'use client';

import React from 'react';

interface VideoEmbedProps {
  url: string;
  title?: string;
}

export default function VideoEmbed({ url, title = 'Video Review' }: VideoEmbedProps) {
  if (!url) return null;

  // Xử lý YouTube URL
  const getYouTubeEmbedUrl = (rawUrl: string): string | null => {
    try {
      // Dạng https://www.youtube.com/watch?v=VIDEO_ID
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = rawUrl.match(regExp);

      if (match && match[2].length === 11) {
        return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0`;
      }

      // Dạng YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
      const shortsMatch = rawUrl.match(/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch && shortsMatch[1]) {
        return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?rel=0`;
      }
    } catch {
      return null;
    }
    return null;
  };

  const ytEmbedUrl = getYouTubeEmbedUrl(url);

  if (ytEmbedUrl) {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9 Aspect Ratio
        height: 0,
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        backgroundColor: '#000'
      }}>
        <iframe
          src={ytEmbedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0
          }}
        />
      </div>
    );
  }

  // Nếu là link khác (TikTok / Direct mp4 / link web)
  return (
    <div style={{
      padding: '1.5rem',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <span style={{ fontSize: '2rem' }}>🎬</span>
        <div>
          <strong style={{ display: 'block', fontSize: '1.1rem' }}>{title}</strong>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Xem video vận hành và test tải thực tế</span>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          padding: '0.7rem 1.5rem',
          borderRadius: '8px',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        Mở xem Video &rarr;
      </a>
    </div>
  );
}
