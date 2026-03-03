import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import NotificationsPanel from './NotificationsPanel';
import './dashboardLayout.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Modal stacking: close sidebar when opening notifications
  useEffect(() => {
    if (notificationsOpen) {
      setSidebarOpen(false);
    }
  }, [notificationsOpen]);

  // Keyboard: Esc to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (notificationsOpen) {
          setNotificationsOpen(false);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, notificationsOpen]);

  // Add/remove modal-open class to body for scroll lock
  useEffect(() => {
    if (sidebarOpen || notificationsOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => document.body.classList.remove('modal-open');
  }, [sidebarOpen, notificationsOpen]);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="layout-main">
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)}
        />
        <div className="layout-content">{children}</div>
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      {notificationsOpen && <div className="notifications-overlay" onClick={() => setNotificationsOpen(false)} />}
    </div>
  );
}
