'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FaTractor, 
  FaChartPie, 
  FaCog, 
  FaSignOutAlt, 
  FaUsers, 
  FaFacebook, 
  FaUserCircle, 
  FaUserShield, 
  FaFileExcel, 
  FaStar, 
  FaVideo,
  FaUserTie,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{username: string, role: string, name?: string} | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      });
  }, []);

  // Tự động đóng sidebar drawer khi chuyển trang trên thiết bị di động
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Ngăn chặn cuộn trang phía sau khi mở mobile sidebar drawer
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Remove language prefix (e.g. /vi) to correctly match routes
  const pathWithoutLang = pathname.replace(/^\/[^\/]+/, '') || '/';
  
  const isActive = (path: string) => {
    if (path === '/admin') return pathWithoutLang === '/admin';
    return pathWithoutLang.startsWith(path);
  };

  const getPageTitle = () => {
    if (pathWithoutLang === '/admin') return 'Bảng điều khiển';
    if (pathWithoutLang.startsWith('/admin/forklifts')) return 'Quản lý Xe Nâng';
    if (pathWithoutLang.startsWith('/admin/purchase-sources')) return 'Nguồn Nhập';
    if (pathWithoutLang.startsWith('/admin/inquiries')) return 'Quản lý Khách hàng';
    if (pathWithoutLang.startsWith('/admin/customers')) return 'Hậu mãi & Bảo dưỡng';
    if (pathWithoutLang.startsWith('/admin/facebook-pages')) return 'Fanpage & Bot AI';
    if (pathWithoutLang.startsWith('/admin/accounting')) return 'Sổ Sách Kế Toán';
    if (pathWithoutLang.startsWith('/admin/testimonials')) return 'Góc Khách Hàng';
    if (pathWithoutLang.startsWith('/admin/media-videos')) return 'Thư Viện Video';
    if (pathWithoutLang.startsWith('/admin/users')) return 'Phân Quyền & Nhân Sự';
    if (pathWithoutLang.startsWith('/admin/settings')) return 'Cài Đặt Hệ Thống';
    return 'Admin Dashboard';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch(e) {
      console.error(e);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.adminLayout}>
      {/* Mobile Drawer Backdrop */}
      <div 
        className={`${styles.backdrop} ${sidebarOpen ? styles.open : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <FaTractor />
            <span>Forklift Portal</span>
          </div>
          <button 
            type="button" 
            className={styles.closeSidebarBtn}
            onClick={closeSidebar}
            aria-label="Đóng menu"
          >
            <FaTimes />
          </button>
        </div>
        
        <nav className={styles.nav}>
          <Link 
            href="/admin" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}
          >
            <FaChartPie /> Dashboard
          </Link>
          <Link 
            href="/admin/forklifts" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/forklifts') ? styles.active : ''}`}
          >
            <FaTractor /> Quản lý Xe nâng
          </Link>
          {user?.role === 'ADMIN' && (
            <Link 
              href="/admin/purchase-sources" 
              onClick={closeSidebar}
              className={`${styles.navItem} ${isActive('/admin/purchase-sources') ? styles.active : ''}`}
            >
              <FaChartPie /> Nguồn nhập
            </Link>
          )}
          <Link 
            href="/admin/inquiries" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/inquiries') ? styles.active : ''}`}
          >
            <FaUsers /> Khách hàng
          </Link>
          <Link 
            href="/admin/customers" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/customers') ? styles.active : ''}`}
          >
            <FaUserTie /> Hậu mãi & Bảo dưỡng
          </Link>
          <Link 
            href="/admin/facebook-pages" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/facebook-pages') ? styles.active : ''}`}
          >
            <FaFacebook /> Fanpage & Bot
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/accounting"
              onClick={closeSidebar}
              className={`${styles.navItem} ${isActive('/admin/accounting') ? styles.active : ''}`}
            >
              <FaFileExcel /> Kế toán
            </Link>
          )}
          <Link 
            href="/admin/testimonials" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/testimonials') ? styles.active : ''}`}
          >
            <FaStar /> Góc Khách Hàng
          </Link>
          <Link 
            href="/admin/media-videos" 
            onClick={closeSidebar}
            className={`${styles.navItem} ${isActive('/admin/media-videos') ? styles.active : ''}`}
          >
            <FaVideo /> Thư viện Video
          </Link>
          {user?.role === 'ADMIN' && (
            <>
              <Link 
                href="/admin/users" 
                onClick={closeSidebar}
                className={`${styles.navItem} ${isActive('/admin/users') ? styles.active : ''}`}
              >
                <FaUserShield /> Phân quyền
              </Link>
              <Link 
                href="/admin/settings" 
                onClick={closeSidebar}
                className={`${styles.navItem} ${isActive('/admin/settings') ? styles.active : ''}`}
              >
                <FaCog /> Cài đặt
              </Link>
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <FaUserCircle className={styles.userAvatar} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || user?.username || 'Đang tải...'}</span>
              <span className={styles.userRole}>{user?.role || 'Guest'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              type="button" 
              className={styles.menuToggle}
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu quản trị"
            >
              <FaBars />
            </button>
            <h2 className={styles.headerTitle}>{getPageTitle()}</h2>
          </div>
          <div className={styles.headerRight}>
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-success'}`}>
              {user?.role || '...'}
            </span>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
