'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTractor, FaChartPie, FaCog, FaSignOutAlt } from 'react-icons/fa';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <FaTractor />
          Forklift Portal
        </div>
        
        <nav className={styles.nav}>
          <Link 
            href="/admin" 
            className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}
          >
            <FaChartPie /> Dashboard
          </Link>
          <Link 
            href="/admin/forklifts" 
            className={`${styles.navItem} ${pathname.startsWith('/admin/forklifts') ? styles.active : ''}`}
          >
            <FaTractor /> Quản lý Xe nâng
          </Link>
          <Link 
            href="/admin/settings" 
            className={`${styles.navItem} ${pathname.startsWith('/admin/settings') ? styles.active : ''}`}
          >
            <FaCog /> Cài đặt
          </Link>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button className={styles.navItem} style={{ width: '100%', textAlign: 'left' }}>
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h2>Admin Dashboard</h2>
          <div>
            <span className="badge badge-success">Admin</span>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
