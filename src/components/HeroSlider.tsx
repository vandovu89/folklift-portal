'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const images = [
  'https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=2070&auto=format&fit=crop'
];

interface HeroSliderProps {
  dict: any;
  lang: string;
}

export default function HeroSlider({ dict, lang }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero-section" style={{ 
      position: 'relative',
      height: '85vh', minHeight: '600px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', textAlign: 'center',
      overflow: 'hidden'
    }}>
      {/* Background Slider */}
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.7) 100%), url(${images[currentIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0
          }}
        />
      </AnimatePresence>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '2rem', maxWidth: '900px' }}>
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="float-anim" 
          style={{ display: 'inline-block', padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.15)', borderRadius: '50px', backdropFilter: 'blur(10px)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}
        >
          Việt Nhật
        </motion.span>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="hero-title" 
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          {lang === 'vi' ? 'Giải Pháp Nâng Hạ Toàn Diện' : 'Comprehensive Forklift Solutions'}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="hero-desc" 
          style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.8 }}
        >
          {lang === 'vi' 
            ? 'Chúng tôi chuyên cung cấp các dòng xe nâng chất lượng cao, nhập khẩu trực tiếp. Đảm bảo hiệu suất vượt trội và độ bền bỉ tối đa cho doanh nghiệp của bạn.' 
            : 'We specialize in providing high-quality, directly imported forklifts. Guaranteeing outstanding performance and maximum durability for your business.'}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link href={`/${lang}/catalog`} className="btn-primary hover-scale" style={{ fontSize: '1.1rem', padding: '1rem 3rem', borderRadius: '50px', fontWeight: 700, backgroundColor: '#38bdf8', color: '#0f172a', border: 'none' }}>
            {dict.nav.catalog}
          </Link>
          <Link href={`/${lang}/contact`} className="btn-secondary hover-scale" style={{ fontSize: '1.1rem', padding: '1rem 3rem', borderRadius: '50px', border: '2px solid rgba(255,255,255,0.5)', color: 'white', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)', fontWeight: 700 }}>
            {dict.common.contact}
          </Link>
        </motion.div>
      </div>
      
      {/* Slide Indicators */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 1 }}>
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: currentIndex === idx ? '30px' : '10px',
              height: '10px',
              borderRadius: '5px',
              backgroundColor: currentIndex === idx ? '#38bdf8' : 'rgba(255,255,255,0.5)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
