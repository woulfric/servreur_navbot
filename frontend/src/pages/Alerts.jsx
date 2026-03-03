import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Battery, Radio, Target, Globe, Settings, Compass, MapPin, Bot, Trash2, Check } from 'lucide-react';
import './alerts.css';

const alertsData = [
  {
    id: 1,
    title: 'Low Battery',
    message: 'NavBot-01 batterie à 15%',
    level: 'warning',
    robot: 'NavBot-01',
    timestamp: '2025-01-19 14:32',
    acknowledged: false,
    source: 'Battery',
  },
  {
    id: 2,
    title: 'Obstacle Detected',
    message: 'Obstacle détecté à 1.5m devant',
    level: 'error',
    robot: 'NavBot-03',
    timestamp: '2025-01-19 14:28',
    acknowledged: false,
    source: 'Sensor',
  },
  {
    id: 3,
    title: 'Mission Completed',
    message: 'Inspection de la zone A terminée avec succès',
    level: 'success',
    robot: 'NavBot-04',
    timestamp: '2025-01-19 14:15',
    acknowledged: true,
    source: 'Mission',
  },
  {
    id: 4,
    title: 'Connection Lost',
    message: 'Perte de connexion avec NavBot-02',
    level: 'error',
    robot: 'NavBot-02',
    timestamp: '2025-01-19 14:10',
    acknowledged: false,
    source: 'Network',
  },
  {
    id: 5,
    title: 'Maintenance Required',
    message: 'Maintenance préventive recommandée',
    level: 'info',
    robot: 'NavBot-01',
    timestamp: '2025-01-19 13:45',
    acknowledged: true,
    source: 'System',
  },
  {
    id: 6,
    title: 'Movement Restricted',
    message: 'Zone d\'accès restreinte détectée',
    level: 'warning',
    robot: 'NavBot-03',
    timestamp: '2025-01-19 13:30',
    acknowledged: false,
    source: 'Navigation',
  },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState(alertsData);
  const [filterLevel, setFilterLevel] = useState('All');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      case 'info':
        return <AlertTriangle size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'Battery':
        return <Battery size={16} />;
      case 'Sensor':
        return <Radio size={16} />;
      case 'Mission':
        return <Target size={16} />;
      case 'Network':
        return <Globe size={16} />;
      case 'System':
        return <Settings size={16} />;
      case 'Navigation':
        return <Compass size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const levelMatch = filterLevel === 'All' || a.level === filterLevel;
    const acknowledgedMatch = showAcknowledged || !a.acknowledged;
    return levelMatch && acknowledgedMatch;
  });

  const handleAcknowledgeAlert = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
    if (selectedAlert?.id === id) {
      setSelectedAlert(null);
    }
  };

  const handleClearAll = () => {
    setAlerts(alerts.filter(a => a.acknowledged));
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const errorCount = alerts.filter(a => a.level === 'error' && !a.acknowledged).length;
  const warningCount = alerts.filter(a => a.level === 'warning' && !a.acknowledged).length;

  return (
    <DashboardLayout>
      {/* Résumé des alertes */}
      <Card title="Résumé des Alertes" span={2}>
        <div className="alerts-summary">
          <div className="summary-card alert-critical">
            <div className="summary-number">{errorCount}</div>
            <div className="summary-label">Critiques</div>
          </div>
          <div className="summary-card alert-warning">
            <div className="summary-number">{warningCount}</div>
            <div className="summary-label">Avertissements</div>
          </div>
          <div className="summary-card alert-unread">
            <div className="summary-number">{unacknowledgedCount}</div>
            <div className="summary-label">Non lues</div>
          </div>
          <div className="summary-card alert-total">
            <div className="summary-number">{alerts.length}</div>
            <div className="summary-label">Total</div>
          </div>
        </div>
      </Card>

      {/* Contrôles et filtres */}
      <Card title="Filtres" span={1}>
        <div className="alerts-controls">
          <div className="filter-group">
            <label>Niveau:</label>
            <div className="filter-buttons">
              {['All', 'error', 'warning', 'success', 'info'].map(level => (
                <button
                  key={level}
                  className={`filter-level-btn ${filterLevel === level ? 'active' : ''}`}
                  onClick={() => setFilterLevel(level)}
                >
                  {level === 'All' ? 'Tous' : level === 'error' ? <><AlertCircle size={14} /> Erreurs</> : level === 'warning' ? <><AlertTriangle size={14} /> Avertissements</> : level === 'success' ? <><CheckCircle size={14} /> Succès</> : <><AlertTriangle size={14} /> Info</>}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
              />
              Afficher les alertes reconnues
            </label>
          </div>

          {unacknowledgedCount > 0 && (
            <button className="btn-clear-all" onClick={handleClearAll}>
              <Trash2 size={16} /> Effacer les reconnues
            </button>
          )}
        </div>
      </Card>

      {/* Liste des alertes */}
      <Card title={`Alertes (${filteredAlerts.length})`} span={2}>
        <div className="alerts-list">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`alert-item alert-${alert.level} ${alert.acknowledged ? 'acknowledged' : ''} ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="alert-icon">{getLevelIcon(alert.level)}</div>
                
                <div className="alert-content">
                  <div className="alert-header">
                    <strong className="alert-title">{alert.title}</strong>
                    <span className="alert-timestamp">{alert.timestamp}</span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-meta">
                    <span className="alert-robot"><Bot size={16} /> {alert.robot}</span>
                    <span className="alert-source" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>{getSourceIcon(alert.source)} {alert.source}</span>
                  </div>
                </div>

                <div className="alert-actions">
                  {!alert.acknowledged && (
                    <button
                      className="action-btn acknowledge-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledgeAlert(alert.id);
                      }}
                      title="Reconnaître"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAlert(alert.id);
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {!alert.acknowledged && <div className="alert-unread-badge"></div>}
              </div>
            ))
          ) : (
            <div className="empty-alerts">Aucune alerte trouvée</div>
          )}
        </div>
      </Card>

      {/* Détails de l'alerte sélectionnée */}
      {selectedAlert && (
        <Card title={`Détails: ${selectedAlert.title}`} span={1}>
          <div className="alert-details">
            <div className="detail-section">
              <h4>Informations</h4>
              <div className="detail-row">
                <span>Niveau</span>
                <span className={`level-badge level-${selectedAlert.level}`}>
                  {getLevelIcon(selectedAlert.level)} {selectedAlert.level.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <span>Robot</span>
                <strong>{selectedAlert.robot}</strong>
              </div>
              <div className="detail-row">
                <span>Source</span>
                <strong>{getSourceIcon(selectedAlert.source)} {selectedAlert.source}</strong>
              </div>
              <div className="detail-row">
                <span>Statut</span>
                <span className={`status-badge status-${selectedAlert.acknowledged ? 'acknowledged' : 'active'}`}>
                  {selectedAlert.acknowledged ? <><Check size={14} /> Reconnue</> : <><AlertCircle size={14} /> Active</>}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Message détaillé</h4>
              <p className="message-box">{selectedAlert.message}</p>
            </div>

            <div className="detail-section">
              <h4>Chronologie</h4>
              <div className="detail-row">
                <span>Générée</span>
                <strong>{selectedAlert.timestamp}</strong>
              </div>
            </div>

            <div className="detail-actions">
              {!selectedAlert.acknowledged ? (
                <button
                  className="detail-btn acknowledge-btn"
                  onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                >
                  <Check size={14} /> Reconnaître l'alerte
                </button>
              ) : (
                <button className="detail-btn acknowledged-btn" disabled>
                  <Check size={14} /> Reconnue le {selectedAlert.timestamp}
                </button>
              )}
              <button
                className="detail-btn delete-btn"
                onClick={() => handleDeleteAlert(selectedAlert.id)}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
