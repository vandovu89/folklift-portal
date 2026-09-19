'use client';

import { useState } from 'react';

export default function PublicImageSlider({ media }: { media: { id: string, url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const minSwipeDistance = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentIndex(prev => (prev + 1) % media.length);
    }
    if (isRightSwipe) {
      setCurrentIndex(prev => (prev === 0 ? media.length - 1 : prev - 1));
    }
  };

  if (!media || media.length === 0) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-border)', color: '#888', borderRadius: '8px' }}>
        Chưa có hình ảnh public
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minWidth: 0 }}>
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ width: '100%', height: '400px', touchAction: 'pan-y' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={media[currentIndex].url} 
          alt="Main" 
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f5', borderRadius: '8px', transition: 'var(--transition)' }} 
        />
      </div>
      
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
