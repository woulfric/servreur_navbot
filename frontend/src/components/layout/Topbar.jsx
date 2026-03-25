import { Bell, User, Moon, Sun, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../ThemeContext';
import { useI18n } from '../../i18n/LanguageContext';
import './topbar.css';

export default function TopBar({ onMenuClick = () => {}, onNotificationsClick = () => {} }) {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <header className="topbar" role="banner">
      <div className="topbar-menu-btn">
        <button 
          className="menu-button"
          onClick={onMenuClick}
          title={t('topbar.menu')}
          aria-label={t('topbar.openNav')}
          aria-expanded={false}
        >
          <Menu size={20} />
        </button>
      </div>
      
      <div className="topbar-actions" role="toolbar" aria-label={t('topbar.actions')}>
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDarkMode ? t('topbar.lightMode') : t('topbar.darkMode')}
          aria-label={isDarkMode ? t('topbar.switchLight') : t('topbar.switchDark')}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="notifications-button"
          onClick={onNotificationsClick}
          title={t('topbar.notifications')}
          aria-label={t('topbar.openNotifications')}
        >
          <Bell size={18} />
        </button>
        <button
          className="profile-button"
          onClick={() => navigate('/profile')}
          title={t('topbar.profile')}
          aria-label={t('topbar.goProfile')}
        >
          <User size={18} />
        </button>
      </div>
    </header>
  );
}
