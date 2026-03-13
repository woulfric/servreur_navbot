import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bot, Map, Flag, MapPin,
  AlertTriangle, History, Settings, Gamepad2, PlayCircle
} from 'lucide-react';
import { useTheme } from '../../ThemeContext';
import './sidebar.css';
import logoLight from './Logo_mod_1.png';
import logoDark from './Logo_mod_2.webp';

const menu = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Robots', path: '/robots', icon: <Bot size={18} /> },
  { label: 'Mapping (SLAM)', path: '/mapview', icon: <PlayCircle size={18} /> }, // Nouvelle page
  { label: 'Maps', path: '/maps', icon: <Map size={18} /> },
  { label: 'Missions', path: '/missions', icon: <Flag size={18} /> },
  { label: 'POI', path: '/poi', icon: <MapPin size={18} /> },
  { label: 'Alerts', path: '/alerts', icon: <AlertTriangle size={18} /> },
  { label: 'History', path: '/history', icon: <History size={18} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={18} /> },
  { label: 'Teleop', path: '/teleop', icon: <Gamepad2 size={18} /> },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { isDarkMode } = useTheme();
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
        {menu.map(item => (
          <NavLink
            to={item.path}
            key={item.label}
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={onClose}
            aria-label={item.label}
          >
            <li role="menuitem">
              {item.icon}
              <span>{item.label}</span>
            </li>
          </NavLink>
        ))}
      </ul>
    </aside>
  );
}