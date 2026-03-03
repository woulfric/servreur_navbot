import { Bell, User, Moon, Sun, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../ThemeContext';
import './topbar.css';

export default function TopBar({ onMenuClick = () => {}, onNotificationsClick = () => {} }) {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="topbar" role="banner">
      <div className="topbar-menu-btn">
        <button 
          className="menu-button"
          onClick={onMenuClick}
          title="Menu"
          aria-label="Ouvrir le menu de navigation"
          aria-expanded={false}
        >
          <Menu size={20} />
        </button>
      </div>
      
      <div className="topbar-actions" role="toolbar" aria-label="Actions">
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          aria-label={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="notifications-button"
          onClick={onNotificationsClick}
          title="Notifications"
          aria-label="Afficher les notifications (Esc pour fermer)"
        >
          <Bell size={18} />
        </button>
        <button
          className="profile-button"
          onClick={() => navigate('/profile')}
          title="Profil"
          aria-label="Aller au profil utilisateur"
        >
          <User size={18} />
        </button>
      </div>
    </header>
  );
}
