import { X, Bell, AlertCircle, Check, Info } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageContext';
import './notificationsPanel.css';

export default function NotificationsPanel({ isOpen = false, onClose = () => {} }) {
  const { t } = useI18n();
  const mockNotifications = [
    { id: 1, type: 'success', title: t('notifications.missionCompleted'), message: t('notifications.missionCompletedMsg'), time: `5 ${t('notifications.min')}`, read: false },
    { id: 2, type: 'warning', title: t('notifications.lowBattery'), message: t('notifications.lowBatteryMsg'), time: `15 ${t('notifications.min')}`, read: false },
    { id: 3, type: 'info', title: t('notifications.newMap'), message: t('notifications.newMapMsg'), time: `1 ${t('notifications.hour')}`, read: true },
    { id: 4, type: 'error', title: t('notifications.connectionError'), message: t('notifications.connectionErrorMsg'), time: `2 ${t('notifications.hours')}`, read: false },
    { id: 5, type: 'success', title: t('notifications.sync'), message: t('notifications.syncMsg'), time: `3 ${t('notifications.hours')}`, read: true },
  ];
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
      aria-label={t('notifications.title')}
      aria-hidden={!isOpen}
    >
      <div className="notifications-header">
        <div className="notifications-title">
          <Bell size={20} />
          <h2>{t('notifications.title')} {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2>
        </div>
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label={t('notifications.close')}
          title={t('notifications.closeEsc')}
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
            <p>{t('notifications.none')}</p>
          </div>
        )}
      </div>

      <div className="notifications-footer">
        <button className="mark-all-read" aria-label={t('notifications.markAllRead')}>
          {t('notifications.markAllRead')}
        </button>
      </div>
    </div>
  );
}
