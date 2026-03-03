import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { Circle } from 'lucide-react';
import './robots.css';

const robotsData = [
  { id: 1, name: 'NavBot-01', status: 'Online', battery: 87, location: 'Zone A', lastSeen: 'Now' },
  { id: 2, name: 'NavBot-02', status: 'Offline', battery: 0, location: 'Charging Station', lastSeen: '5m ago' },
  { id: 3, name: 'NavBot-03', status: 'Online', battery: 65, location: 'Zone B', lastSeen: 'Now' },
  { id: 4, name: 'NavBot-04', status: 'Idle', battery: 92, location: 'Base', lastSeen: '2m ago' },
  { id: 5, name: 'NavBot-05', status: 'Offline', battery: 0, location: 'Service', lastSeen: '1h ago' },
];

export default function Robots() {
  const [selectedRobot, setSelectedRobot] = useState(null);

  // Séparer les robots par statut
  const onlineRobots = robotsData.filter(r => r.status === 'Online');
  const idleRobots = robotsData.filter(r => r.status === 'Idle');
  const offlineRobots = robotsData.filter(r => r.status === 'Offline');

  const RobotRow = ({ robot }) => (
    <div
      key={robot.id}
      className={`robot-row ${selectedRobot?.id === robot.id ? 'selected' : ''}`}
      onClick={() => setSelectedRobot(robot)}
    >
      <div className="robot-name">
        <div className={`status-indicator status-${robot.status.toLowerCase()}`}></div>
        <strong>{robot.name}</strong>
      </div>
      <div className="robot-battery">
        <div className="battery-bar">
          <div
            className="battery-fill"
            style={{
              width: `${robot.battery}%`,
              backgroundColor: robot.battery > 50 ? '#22c55e' : robot.battery > 20 ? '#eab308' : '#ef4444',
            }}
          ></div>
        </div>
        <span>{robot.battery}%</span>
      </div>
      <div className="robot-location">{robot.location}</div>
      <div className="robot-lastseen">{robot.lastSeen}</div>
      <button className="robot-action-btn" onClick={(e) => { e.stopPropagation(); alert(`Connecté à ${robot.name}`); }}>
        Connecter
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <Card title={`Robots Fleet (${robotsData.length})`} span={2}>
        <div className="robots-list">
          {/* Robots en ligne */}
          <div className="robots-section">
            <h3 className="section-title online">
              <Circle size={16} fill="#22c55e" color="#22c55e" /> En ligne ({onlineRobots.length})
            </h3>
            <div className="robots-group">
              {onlineRobots.length > 0 ? (
                onlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">Aucun robot en ligne</p>
              )}
            </div>
          </div>

          {/* Robots en attente */}
          <div className="robots-section">
            <h3 className="section-title idle">
              <Circle size={16} fill="#eab308" color="#eab308" /> En attente ({idleRobots.length})
            </h3>
            <div className="robots-group">
              {idleRobots.length > 0 ? (
                idleRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">Aucun robot en attente</p>
              )}
            </div>
          </div>

          {/* Robots hors ligne */}
          <div className="robots-section">
            <h3 className="section-title offline">
              <Circle size={16} fill="#ef4444" color="#ef4444" /> Hors ligne ({offlineRobots.length})
            </h3>
            <div className="robots-group">
              {offlineRobots.length > 0 ? (
                offlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">Aucun robot hors ligne</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Détails du robot sélectionné */}
      {selectedRobot && (
        <Card title={`Détails: ${selectedRobot.name}`} span={1}>
          <div className="robot-details">
            <div className="detail-row">
              <span>Status</span>
              <strong className={`status-text status-${selectedRobot.status.toLowerCase()}`}>
                {selectedRobot.status}
              </strong>
            </div>
            <div className="detail-row">
              <span>Batterie</span>
              <strong>{selectedRobot.battery}%</strong>
            </div>
            <div className="detail-row">
              <span>Localisation</span>
              <strong>{selectedRobot.location}</strong>
            </div>
            <div className="detail-row">
              <span>Dernier contact</span>
              <strong>{selectedRobot.lastSeen}</strong>
            </div>
            <button className="detail-action-btn">Contrôler le robot</button>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
