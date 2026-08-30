import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

export default async function PublicFooter({ lang }: { lang: 'en' | 'vi' }) {
  const dict = await getDictionary(lang);
  
  return (
    <footer style={{ background: '#0f172a', color: '#f8fafc', padding: '5rem 5% 2rem 5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem' }}>
        
        {/* Company Info */}
        <div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1.5rem', color: '#38bdf8' }}>
            KYOWA<span style={{ color: 'white' }}>FORKLIFT</span>
          </h3>
          <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: 1.6, fontSize: '1.1rem' }}>
            {dict.footer.company_name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', opacity: 0.9 }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaMapMarkerAlt color="#38bdf8" />
            </div>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{dict.footer.address}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', opacity: 0.9 }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaPhoneAlt color="#38bdf8" />
            </div>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{dict.footer.hotline}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', opacity: 0.9 }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaEnvelope color="#38bdf8" />
            </div>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{dict.footer.email}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '2rem', color: '#38bdf8' }}>{dict.footer.quick_links}</h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href={`/${lang}`} style={{ color: '#f8fafc', opacity: 0.8, textDecoration: 'none', transition: 'opacity 0.2s' }}>{dict.nav.home}</Link></li>
            <li><Link href={`/${lang}/catalog`} style={{ color: '#f8fafc', opacity: 0.8, textDecoration: 'none', transition: 'opacity 0.2s' }}>{dict.nav.catalog}</Link></li>
            <li><Link href={`/${lang}/about`} style={{ color: '#f8fafc', opacity: 0.8, textDecoration: 'none', transition: 'opacity 0.2s' }}>{dict.nav.about}</Link></li>
            <li><Link href={`/${lang}/policies`} style={{ color: '#f8fafc', opacity: 0.8, textDecoration: 'none', transition: 'opacity 0.2s' }}>{dict.nav.policies}</Link></li>
            <li><Link href={`/${lang}/contact`} style={{ color: '#f8fafc', opacity: 0.8, textDecoration: 'none', transition: 'opacity 0.2s' }}>{dict.nav.contact}</Link></li>
          </ul>
        </div>

        {/* Google Maps */}
        <div>
          <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '2rem', color: '#38bdf8' }}>Google Maps</h4>
          <div style={{ width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1m2!1s0x3135ab9bd9861ca1%3A0xe7887f7b72ca17a9!2zSMOgIE7hu5lpLCBIb8OgbiBLaeG6v20sIEjDoCBO4buZaSwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade">
            </iframe>
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'center', margin: '5rem auto 0 auto', maxWidth: '1400px', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', opacity: 0.6, fontSize: '0.9rem' }}>
        {dict.footer.rights}
      </div>
    </footer>
  );
}
