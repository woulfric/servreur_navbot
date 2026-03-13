import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Card from '../components/common/Card.jsx';
import { useState } from 'react';
import { Bot, Target, MapPin, Globe, CircleCheck, Play, Clock } from 'lucide-react';
import './dashboard.css';

export default function Dashboard() {
  const [robots] = useState([
    { id: 1, name: 'NavBot-01', status: 'Online', battery: 87, mode: 'AUTONOMOUS', temp: 45, location: '32.578 / 15.672' },
    { id: 2, name: 'NavBot-02', status: 'Offline', battery: 0, mode: 'IDLE', temp: 32, location: 'Unknown' },
    { id: 3, name: 'NavBot-03', status: 'Online', battery: 65, mode: 'AUTONOMOUS', temp: 48, location: '28.145 / 12.334' },
    { id: 4, name: 'NavBot-04', status: 'Idle', battery: 92, mode: 'CHARGING', temp: 38, location: 'Dock' },
  ]);

  const [missions] = useState([
    { id: 1, name: 'Warehouse Patrol', robot: 'NavBot-01', status: 'Running', progress: 65 },
    { id: 2, name: 'Zone Scan', robot: 'NavBot-03', status: 'Completed', progress: 100 },
    { id: 3, name: 'Map Update', robot: 'NavBot-04', status: 'Queued', progress: 0 },
  ]);

  const [recentAlerts] = useState([
    { id: 1, level: 'warning', message: 'NavBot-01 batterie à 15%', time: '5 min' },
    { id: 2, level: 'error', message: 'Obstacle détecté', time: '12 min' },
    { id: 3, level: 'info', message: 'Mission complétée', time: '30 min' },
  ]);

  const stats = {
    totalRobots: robots.length,
    onlineRobots: robots.filter(r => r.status === 'Online').length,
    runningMissions: missions.filter(m => m.status === 'Running').length,
    successRate: 92,
  };

  const getBatteryColor = (battery) => {
    if (battery > 70) return 'battery-high';
    if (battery > 30) return 'battery-medium';
    return 'battery-low';
  };

  const getStatusColor = (status) => {
    if (status === 'Online') return 'status-online';
    if (status === 'Idle') return 'status-idle';
    return 'status-offline';
  };

  const getMissionStatusColor = (status) => {
    if (status === 'Running') return 'mission-running';
    if (status === 'Completed') return 'mission-completed';
    return 'mission-queued';
  };

  return (
    <DashboardLayout>
      {/* Statistiques principales */}
      <Card title="Aperçu du Système" span={2}>
        <div className="dashboard-stats">
          <div className="stat-box stat-total">
            <div className="stat-icon"><Bot size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalRobots}</div>
              <div className="stat-label">Robots Total</div>
            </div>
          </div>
          <div className="stat-box stat-online">
            <div className="stat-icon"><CircleCheck size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.onlineRobots}</div>
              <div className="stat-label">En ligne</div>
            </div>
          </div>
          <div className="stat-box stat-missions">
            <div className="stat-icon"><Target size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.runningMissions}</div>
              <div className="stat-label">Missions actives</div>
            </div>
          </div>
          <div className="stat-box stat-success">
            <div className="stat-icon"><CircleCheck size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.successRate}%</div>
              <div className="stat-label">Taux de succès</div>
            </div>
          </div>
        </div>
      </Card>

      {/* État des robots */}
      <Card title="État des Robots" span={2}>
        <div className="robots-status-grid">
          {robots.map(robot => (
            <div key={robot.id} className="robot-status-card">
              <div className="robot-header">
                <strong className="robot-name">{robot.name}</strong>
                <span className={`robot-badge ${getStatusColor(robot.status)}`}>
                  {robot.status}
                </span>
              </div>

              <div className="robot-stat">
                <span className="stat-label">Batterie</span>
                <div className="stat-value-bar">
                  <div className={`bar-fill ${getBatteryColor(robot.battery)}`} style={{ width: `${robot.battery}%` }}></div>
                </div>
                <span className="stat-text">{robot.battery}%</span>
              </div>

              <div className="robot-stat">
                <span className="stat-label">Température</span>
                <span className="stat-text">{robot.temp}°C</span>
              </div>

              <div className="robot-stat">
                <span className="stat-label">Mode</span>
                <span className="stat-text">{robot.mode}</span>
              </div>

              <div className="robot-stat">
                <span className="stat-label">Position</span>
                <span className="stat-text">{robot.location}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Missions en cours */}
      <Card title="Missions Actives" span={1}>
        <div className="missions-panel">
          {missions.length > 0 ? (
            missions.map(mission => (
              <div key={mission.id} className="mission-item">
                <div className="mission-header">
                  <strong>{mission.name}</strong>
                  <span className={`mission-status ${getMissionStatusColor(mission.status)}`}>
                    {mission.status === 'Running' ? <Play size={14} /> : mission.status === 'Completed' ? <CircleCheck size={14} /> : <Clock size={14} />}
                    {mission.status}
                  </span>
                </div>
                <div className="mission-robot"><Bot size={16} /> {mission.robot}</div>
                <div className="mission-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${mission.progress}%` }}></div>
                  </div>
                  <span className="progress-text">{mission.progress}%</span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">Aucune mission</p>
          )}
        </div>
      </Card>

      {/* Alertes récentes */}
      <Card title="Alertes Récentes" span={1}>
        <div className="alerts-panel">
          {recentAlerts.length > 0 ? (
            recentAlerts.map(alert => (
              <div key={alert.id} className={`alert-item alert-${alert.level}`}>
                <div className="alert-marker"></div>
                <div className="alert-content">
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">{alert.time} ago</span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">Aucune alerte</p>
          )}
        </div>
      </Card>

      {/* Aperçu de la carte */}
      <Card title="Dernière Carte" span={1}>
        <div className="map-preview">
          <svg viewBox="0 0 400 300" className="preview-svg">
            <rect width="400" height="300" fill="#1a2332" />
            <defs>
              <pattern id="grid-dash" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2a3f5f" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid-dash)" />
            <rect x="30" y="30" width="340" height="240" fill="none" stroke="#22c55e" strokeWidth="6" />
            <circle cx="200" cy="150" r="15" fill="#22c55e" opacity="0.5" />
            <circle cx="200" cy="150" r="12" fill="none" stroke="#22c55e" strokeWidth="2" />
            <polygon points="200,135 195,150 200,145 205,150" fill="#22c55e" />
          </svg>
          <div className="map-info">
            <span><MapPin size={16} /> Étage 1</span>
            <span><Target size={16} /> 3 POI</span>
          </div>
        </div>
      </Card>

      {/* Système */}
      <Card title="Système" span={1}>
        <div className="system-panel">
          <div className="system-item">
            <span>Status</span>
            <span className="system-value online"><CircleCheck size={16} /> Opérationnel</span>
          </div>
          <div className="system-item">
            <span>Connexion</span>
            <span className="system-value"><Globe size={16} /> Connecté</span>
          </div>
          <div className="system-item">
            <span>Version</span>
            <span className="system-value">1.2.3</span>
          </div>
          <div className="system-item">
            <span>Uptime</span>
            <span className="system-value">7 jours</span>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
