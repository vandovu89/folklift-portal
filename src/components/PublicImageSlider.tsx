'use client';

import { useState } from 'react';

export default function PublicImageSlider({ media }: { media: { id: string, url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
  };

  const nextImage = () => {
    setCurrentIndex(prev => (prev + 1) % media.length);
  };

  const prevImage = () => {
    setCurrentIndex(prev => (prev === 0 ? media.length - 1 : prev - 1));
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
          onClick={() => setIsLightboxOpen(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f5', borderRadius: '8px', transition: 'var(--transition)', cursor: 'zoom-in' }} 
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

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Close Button */}
          <button 
            onClick={() => setIsLightboxOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'transparent', border: 'none', color: 'white',
              fontSize: '30px', cursor: 'pointer', zIndex: 10000
            }}
          >
            &times;
          </button>

          {/* Previous Button */}
          {media.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              style={{
                position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
                fontSize: '30px', padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', zIndex: 10000
              }}
            >
              &#10094;
            </button>
          )}

          {/* Main Lightbox Image */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '90%', height: '80%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={media[currentIndex].url} 
              alt="Zoomed" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          </div>

          {/* Next Button */}
          {media.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              style={{
                position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
                fontSize: '30px', padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', zIndex: 10000
              }}
            >
              &#10095;
            </button>
          )}
          
          {/* Thumbnail strip in Lightbox */}
          {media.length > 1 && (
            <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '10px', maxWidth: '90vw', overflowX: 'auto', padding: '10px' }}>
              {media.map((m, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  key={`lb-${m.id}`} 
                  src={m.url} 
                  alt="Thumb" 
                  onClick={() => setCurrentIndex(idx)}
                  style={{ 
                    width: '60px', height: '60px', objectFit: 'cover', cursor: 'pointer',
                    border: currentIndex === idx ? '2px solid white' : 'none',
                    opacity: currentIndex === idx ? 1 : 0.5
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
