import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Card from '../components/common/Card.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Bot, Target, MapPin, Globe, CircleCheck, Play, Clock } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import './dashboard.css';

const POLL_INTERVAL_MS = 4000;

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const formatTimeAgo = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value).getTime();
  const diffMs = Date.now() - date;

  if (Number.isNaN(date) || diffMs < 0) {
    return '-';
  }

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'moins d\'une minute';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} j`;
};

const getRobotStatusColor = (status) => {
  if (status === 'online') {
    return 'status-online';
  }

  if (status === 'idle') {
    return 'status-idle';
  }

  return 'status-offline';
};

const getMissionStatusColor = (status) => {
  if (status === 'Running') {
    return 'mission-running';
  }

  if (status === 'Completed') {
    return 'mission-completed';
  }

  return 'mission-queued';
};

const getMissionProgress = (status) => {
  switch (status) {
    case 'Completed':
      return 100;
    case 'Running':
      return 50;
    case 'Pending':
      return 5;
    case 'Failed':
      return 0;
    default:
      return 0;
  }
};

export default function Dashboard() {
  const { language } = useI18n();
  const [robots, setRobots] = useState([]);
  const [missions, setMissions] = useState([]);
  const [maps, setMaps] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchDashboardData = async () => {
      try {
        const [robotsResponse, missionsResponse, mapsResponse] = await Promise.all([
          fetch('/api/active'),
          fetch('/api/missions'),
          fetch('/api/maps'),
        ]);

        const [robotsData, missionsData, mapsData] = await Promise.all([
          robotsResponse.json(),
          missionsResponse.json(),
          mapsResponse.json(),
        ]);

        if (!robotsResponse.ok || !missionsResponse.ok || !mapsResponse.ok) {
          throw new Error('Erreur lors du chargement du tableau de bord');
        }

        if (isCancelled) {
          return;
        }

        setRobots(Array.isArray(robotsData.robots) ? robotsData.robots : []);
        setMissions(Array.isArray(missionsData.missions) ? missionsData.missions : []);
        setMaps(Array.isArray(mapsData.maps) ? mapsData.maps : []);
        setLastUpdated(new Date().toISOString());
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      }
    };

    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeMissions = useMemo(() => {
    return missions
      .filter((mission) => mission.status === 'Running' || mission.status === 'Pending')
      .sort((leftMission, rightMission) => {
        return new Date(rightMission.createdAt) - new Date(leftMission.createdAt);
      })
      .slice(0, 4);
  }, [missions]);

  const recentAlerts = useMemo(() => {
    return missions
      .filter((mission) => mission.status !== 'Pending')
      .sort((leftMission, rightMission) => {
        return new Date(rightMission.updatedAt) - new Date(leftMission.updatedAt);
      })
      .slice(0, 4)
      .map((mission) => {
        if (mission.status === 'Failed') {
          return {
            id: mission.missionId,
            level: 'error',
            message: `Mission ${mission.planName} en echec sur ${mission.robotId}`,
            time: formatTimeAgo(mission.updatedAt),
          };
        }

        if (mission.status === 'Completed') {
          return {
            id: mission.missionId,
            level: 'info',
            message: `Mission ${mission.planName} terminee sur ${mission.robotId}`,
            time: formatTimeAgo(mission.updatedAt),
          };
        }

        return {
          id: mission.missionId,
          level: 'warning',
          message: `Mission ${mission.planName} en cours sur ${mission.robotId}`,
          time: formatTimeAgo(mission.updatedAt),
        };
      });
  }, [missions]);

  const latestMap = maps[0] || null;

  const stats = useMemo(() => {
    const terminalMissions = missions.filter(
      (mission) => mission.status === 'Completed' || mission.status === 'Failed'
    );
    const completedMissions = terminalMissions.filter(
      (mission) => mission.status === 'Completed'
    ).length;

    return {
      activeRobots: robots.length,
      totalMaps: maps.length,
      runningMissions: activeMissions.filter((mission) => mission.status === 'Running').length,
      successRate:
        terminalMissions.length > 0
          ? Math.round((completedMissions / terminalMissions.length) * 100)
          : 0,
    };
  }, [activeMissions, maps.length, missions, robots.length]);

  return (
    <DashboardLayout>
      <Card title={language === 'en' ? 'System Overview' : 'Apercu du Systeme'} span={2}>
        <div className="dashboard-stats">
          <div className="stat-box stat-total">
            <div className="stat-icon"><Bot size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeRobots}</div>
              <div className="stat-label">{language === 'en' ? 'Active robots' : 'Robots actifs'}</div>
            </div>
          </div>
          <div className="stat-box stat-online">
            <div className="stat-icon"><MapPin size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalMaps}</div>
              <div className="stat-label">{language === 'en' ? 'Maps stored' : 'Cartes stockees'}</div>
            </div>
          </div>
          <div className="stat-box stat-missions">
            <div className="stat-icon"><Target size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.runningMissions}</div>
              <div className="stat-label">{language === 'en' ? 'Active missions' : 'Missions actives'}</div>
            </div>
          </div>
          <div className="stat-box stat-success">
            <div className="stat-icon"><CircleCheck size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.successRate}%</div>
              <div className="stat-label">{language === 'en' ? 'Success rate' : 'Taux de succes'}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title={language === 'en' ? 'Robot Status' : 'Etat des Robots'} span={2}>
        <div className="robots-status-grid">
          {robots.length > 0 ? (
            robots.map((robot) => (
              <div key={robot.id || robot.robotId} className="robot-status-card">
                <div className="robot-header">
                  <strong className="robot-name">{robot.name || robot.robotId || robot.id}</strong>
                  <span className={`robot-badge ${getRobotStatusColor(robot.status)}`}>
                    {robot.status || 'unknown'}
                  </span>
                </div>

                <div className="robot-stat">
                  <span className="stat-label">ID</span>
                  <span className="stat-text">{robot.robotId || robot.id}</span>
                </div>

                <div className="robot-stat">
                  <span className="stat-label">Type</span>
                  <span className="stat-text">{robot.type || 'unknown'}</span>
                </div>

                <div className="robot-stat">
                  <span className="stat-label">{language === 'en' ? 'Last seen' : 'Derniere vue'}</span>
                  <span className="stat-text">{formatTimeAgo(robot.lastSeen)}</span>
                </div>

                <div className="robot-stat">
                  <span className="stat-label">MQTT</span>
                  <span className="stat-text">{language === 'en' ? 'Connected' : 'Connecte'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">{language === 'en' ? 'No active robot' : 'Aucun robot actif'}</p>
          )}
        </div>
      </Card>

      <Card title={language === 'en' ? 'Active Missions' : 'Missions Actives'} span={1}>
        <div className="missions-panel">
          {activeMissions.length > 0 ? (
            activeMissions.map((mission) => (
              <div key={mission.missionId} className="mission-item">
                <div className="mission-header">
                  <strong>{mission.missionId}</strong>
                  <span className={`mission-status ${getMissionStatusColor(mission.status)}`}>
                    {mission.status === 'Running' ? <Play size={14} /> : mission.status === 'Completed' ? <CircleCheck size={14} /> : <Clock size={14} />}
                    {mission.status}
                  </span>
                </div>
                <div className="mission-robot"><Bot size={16} /> {mission.robotId}</div>
                <div className="mission-robot"><MapPin size={16} /> {mission.planName}</div>
                <div className="mission-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getMissionProgress(mission.status)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{getMissionProgress(mission.status)}%</span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">{language === 'en' ? 'No active mission' : 'Aucune mission active'}</p>
          )}
        </div>
      </Card>

      <Card title={language === 'en' ? 'Recent Alerts' : 'Alertes Recentes'} span={1}>
        <div className="alerts-panel">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert) => (
              <div key={alert.id} className={`alert-item alert-${alert.level}`}>
                <div className="alert-marker"></div>
                <div className="alert-content">
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">
                    {language === 'en' ? `${alert.time} ago` : `il y a ${alert.time}`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">{language === 'en' ? 'No alert' : 'Aucune alerte'}</p>
          )}
        </div>
      </Card>

      <Card title={language === 'en' ? 'Latest Map' : 'Derniere Carte'} span={1}>
        <div className="map-preview">
          {latestMap ? (
            <>
              <div className="mission-item">
                <div className="mission-header">
                  <strong>{latestMap.name}</strong>
                  <span className="mission-status mission-completed">
                    <MapPin size={14} />
                    map
                  </span>
                </div>
                <div className="mission-robot"><MapPin size={16} /> {latestMap.size}</div>
                <div className="mission-robot"><Clock size={16} /> {formatDateTime(latestMap.lastModified)}</div>
              </div>
              <div className="map-info">
                <span>{latestMap.created}</span>
                <span>{latestMap.pointsCount}</span>
              </div>
            </>
          ) : (
            <p className="empty-message">{language === 'en' ? 'No map available' : 'Aucune carte disponible'}</p>
          )}
        </div>
      </Card>

      <Card title={language === 'en' ? 'System' : 'Systeme'} span={1}>
        <div className="system-panel">
          <div className="system-item">
            <span>Status</span>
            <span className="system-value online"><CircleCheck size={16} /> {language === 'en' ? 'Operational' : 'Operationnel'}</span>
          </div>
          <div className="system-item">
            <span>{language === 'en' ? 'Connection' : 'Connexion'}</span>
            <span className="system-value"><Globe size={16} /> MQTT cloud</span>
          </div>
          <div className="system-item">
            <span>Storage</span>
            <span className="system-value">MongoDB + files</span>
          </div>
          <div className="system-item">
            <span>{language === 'en' ? 'Last sync' : 'Derniere synchro'}</span>
            <span className="system-value">{formatDateTime(lastUpdated)}</span>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
