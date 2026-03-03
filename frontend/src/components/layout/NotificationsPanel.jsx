import { X, Bell, AlertCircle, Check, Info } from 'lucide-react';
import './notificationsPanel.css';

const mockNotifications = [
  { id: 1, type: 'success', title: 'Mission complétée', message: 'La mission M-001 est terminée avec succès', time: '5 min', read: false },
  { id: 2, type: 'warning', title: 'Batterie faible', message: 'Le robot R-02 a une batterie à 20%', time: '15 min', read: false },
  { id: 3, type: 'info', title: 'Nouvelle carte', message: 'Une nouvelle carte a été ajoutée au système', time: '1 heure', read: true },
  { id: 4, type: 'error', title: 'Erreur de connexion', message: 'Impossible de se connecter au robot R-05', time: '2 heures', read: false },
  { id: 5, type: 'success', title: 'Synchronisation', message: 'Les données ont été synchronisées', time: '3 heures', read: true },
];

export default function NotificationsPanel({ isOpen = false, onClose = () => {} }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <Check size={18} />;
      case 'warning':
        return <AlertCircle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <div 
      className={`notifications-panel ${isOpen ? 'notifications-open' : ''}`}
      role="complementary"
      aria-label="Notifications"
      aria-hidden={!isOpen}
    >
      <div className="notifications-header">
        <div className="notifications-title">
          <Bell size={20} />
          <h2>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2>
        </div>
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Fermer les notifications"
          title="Fermer (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      <div className="notifications-list">
        {mockNotifications.length > 0 ? (
          mockNotifications.map(notif => (
            <div 
              key={notif.id} 
              className={`notification-item notification-${notif.type} ${notif.read ? 'notification-read' : 'notification-unread'}`}
              role="article"
              aria-label={`${notif.title}: ${notif.message}`}
            >
              <div className="notification-icon">
                {getIcon(notif.type)}
              </div>
              <div className="notification-content">
                <h3>{notif.title}</h3>
                <p>{notif.message}</p>
                <span className="notification-time">{notif.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-notifications">
            <Bell size={32} />
            <p>Aucune notification</p>
          </div>
        )}
      </div>

      <div className="notifications-footer">
        <button className="mark-all-read" aria-label="Marquer toutes les notifications comme lues">
          Marquer tout comme lu
        </button>
      </div>
    </div>
  );
}
