'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaTractor, FaChartPie, FaCog, FaSignOutAlt, FaUsers, FaFacebook, FaUserCircle } from 'react-icons/fa';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Remove language prefix (e.g. /vi) to correctly match routes
  const pathWithoutLang = pathname.replace(/^\/[^\/]+/, '') || '/';
  
  const isActive = (path: string) => {
    if (path === '/admin') return pathWithoutLang === '/admin';
    return pathWithoutLang.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch(e) {
      console.error(e);
    }
  };

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
            className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}
          >
            <FaChartPie /> Dashboard
          </Link>
          <Link 
            href="/admin/forklifts" 
            className={`${styles.navItem} ${isActive('/admin/forklifts') ? styles.active : ''}`}
          >
            <FaTractor /> Quản lý Xe nâng
          </Link>
          <Link 
            href="/admin/purchase-sources" 
            className={`${styles.navItem} ${isActive('/admin/purchase-sources') ? styles.active : ''}`}
          >
            <FaChartPie /> Nguồn nhập
          </Link>
          <Link 
            href="/admin/inquiries" 
            className={`${styles.navItem} ${isActive('/admin/inquiries') ? styles.active : ''}`}
          >
            <FaUsers /> Khách hàng
          </Link>
          <Link 
            href="/admin/facebook-pages" 
            className={`${styles.navItem} ${isActive('/admin/facebook-pages') ? styles.active : ''}`}
          >
            <FaFacebook /> Fanpage & Bot
          </Link>
          <Link 
            href="/admin/settings" 
            className={`${styles.navItem} ${isActive('/admin/settings') ? styles.active : ''}`}
          >
            <FaCog /> Cài đặt
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <FaUserCircle className={styles.userAvatar} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>Administrator</span>
              <span className={styles.userRole}>System Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
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
