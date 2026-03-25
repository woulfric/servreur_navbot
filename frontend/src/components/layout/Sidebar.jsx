import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Map,
  Flag,
  MapPin,
  AlertTriangle,
  History,
  Settings,
  Gamepad2,
  PlayCircle,
} from 'lucide-react';
import { useTheme } from '../../ThemeContext';
import { useI18n } from '../../i18n/LanguageContext';
import './sidebar.css';
import logoLight from './Logo_mod_1.png';
import logoDark from './Logo_mod_2.webp';

const menu = [
  { labelKey: 'nav.dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { labelKey: 'nav.robots', path: '/robots', icon: <Bot size={18} /> },
  { labelKey: 'nav.maps', path: '/maps', icon: <Map size={18} /> },
  { labelKey: 'nav.teleop', path: '/teleop', icon: <Gamepad2 size={18} /> },
  { labelKey: 'nav.mapping', path: '/mapview', icon: <PlayCircle size={18} /> },
  { labelKey: 'nav.poi', path: '/poi', icon: <MapPin size={18} /> },
  { labelKey: 'nav.missions', path: '/missions', icon: <Flag size={18} /> },
  { labelKey: 'nav.history', path: '/history', icon: <History size={18} /> },
  { labelKey: 'nav.alerts', path: '/alerts', icon: <AlertTriangle size={18} /> },
  { labelKey: 'nav.settings', path: '/settings', icon: <Settings size={18} /> },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const logoSrc = isDarkMode ? logoLight : logoDark;

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="logo-container">
        <img src={logoSrc} alt="NavBot Logo" className="topbar-logo" />
        <span className="logo-text">NavBot</span>
      </div>

      <ul role="menubar">
        {menu.map((item) => (
          <NavLink
            to={item.path}
            key={item.labelKey}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={onClose}
            aria-label={t(item.labelKey)}
          >
            <li role="menuitem">
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </li>
          </NavLink>
        ))}
      </ul>

      <div className="sidebar-footer" aria-label="Informations legales">
        <span className="sidebar-footer-copy">© 2026 NavBot</span>
        <span className="sidebar-footer-sep">•</span>
        <span>{t('nav.terms')}</span>
        <span className="sidebar-footer-sep">•</span>
        <span>{t('nav.privacy')}</span>
      </div>
    </aside>
  );
}