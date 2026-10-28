import styles from './admin.module.css';

export default function AdminLoading() {
  return (
    <div>
      <div 
        style={{ 
          height: '2rem', 
          width: '220px', 
          background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', 
          borderRadius: '6px', 
          marginBottom: '1.5rem',
          animation: 'pulse 1.5s infinite' 
        }} 
      />

      <div className={styles.dashboardStatsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="glass-panel" 
            style={{ 
              padding: '1.25rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1.25rem' 
            }}
          >
            <div 
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '50%', 
                background: '#e2e8f0',
                flexShrink: 0,
                animation: 'pulse 1.5s infinite'
              }} 
            />
            <div style={{ flex: 1 }}>
              <div 
                style={{ 
                  height: '0.85rem', 
                  width: '60%', 
                  background: '#e2e8f0', 
                  borderRadius: '4px', 
                  marginBottom: '0.5rem',
                  animation: 'pulse 1.5s infinite'
                }} 
              />
              <div 
                style={{ 
                  height: '1.75rem', 
                  width: '40%', 
                  background: '#cbd5e1', 
                  borderRadius: '4px',
                  animation: 'pulse 1.5s infinite'
                }} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.dashboardMainGrid}>
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '180px' }}>
          <div style={{ height: '1.25rem', width: '50%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '0.9rem', width: '80%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '2.5rem', width: '180px', background: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '180px' }}>
          <div style={{ height: '1.25rem', width: '40%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((j) => (
              <div key={j} style={{ height: '2rem', background: '#f8fafc', borderRadius: '4px', borderLeft: '3px solid #cbd5e1', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
