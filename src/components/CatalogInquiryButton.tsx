'use client';

import { useState } from 'react';
import InquiryForm from '@/app/[lang]/(public)/machine/[id]/InquiryForm';

export default function CatalogInquiryButton({ 
  lang, 
  dict, 
  forkliftId, 
  forkliftName, 
  internalCode 
}: { 
  lang: string, 
  dict: any, 
  forkliftId: string, 
  forkliftName: string, 
  internalCode: string 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={(e) => { e.preventDefault(); setIsOpen(true); }}
        style={{ flex: 1, backgroundColor: '#f97316', color: 'white', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', border: '1px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
        ✉️ {lang === 'vi' ? 'Liên hệ' : 'Inquiry'}
      </button>

      {isOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <div 
            style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} 
            onClick={(e) => { e.stopPropagation(); }}
          >
            <button 
              onClick={(e) => { e.preventDefault(); setIsOpen(false); }} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
              aria-label="Close"
            >
              &times;
            </button>
            
            <div style={{ padding: '1.5rem 1.5rem 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
               <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', paddingRight: '2rem' }}>{lang === 'vi' ? 'Yêu cầu báo giá' : 'Request Inquiry'}</h3>
               <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#3b82f6', fontWeight: 'bold' }}>{forkliftName}</p>
            </div>
            
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <InquiryForm 
                forkliftId={forkliftId} 
                lang={lang} 
                dictionary={dict} 
                internalCode={internalCode} 
                isModal={true} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
