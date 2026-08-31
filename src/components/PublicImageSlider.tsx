'use client';

import { useState } from 'react';

export default function PublicImageSlider({ media }: { media: { id: string, url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!media || media.length === 0) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-border)', color: '#888', borderRadius: '8px' }}>
        Chưa có hình ảnh public
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media[currentIndex].url} alt="Main" style={{ width: '100%', height: '400px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '8px', transition: 'var(--transition)' }} />
      
      {media.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {media.map((m, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              key={m.id} 
              src={m.url} 
              alt="Thumb" 
              onClick={() => setCurrentIndex(index)}
              style={{ 
                width: '80px', 
                height: '80px', 
                objectFit: 'cover', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                border: currentIndex === index ? '2px solid var(--primary)' : '1px solid #ddd',
                opacity: currentIndex === index ? 1 : 0.6,
                transition: 'var(--transition)'
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
