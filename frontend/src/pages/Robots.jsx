import { useContext } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { Circle } from 'lucide-react';
import { RobotContext } from '../context/RobotContext';
import './robots.css';

export default function Robots() {
  const { activeRobots, selectedRobotId, setSelectedRobotId } = useContext(RobotContext);

  // Adaptation des donnees brutes du backend pour l'interface utilisateur
  // Les champs batterie et localisation seront mis a jour plus tard via la telemetrie
  const formattedRobots = activeRobots.map(robot => ({
    id: robot.id,
    name: robot.id, // L'ID MQTT sert de nom par defaut
    status: robot.status === 'online' ? 'Online' : 'Offline',
    battery: '--',
    location: 'En attente',
    lastSeen: 'À l\'instant'
  }));

  const onlineRobots = formattedRobots.filter(r => r.status === 'Online');
  const idleRobots = formattedRobots.filter(r => r.status === 'Idle');
  const offlineRobots = formattedRobots.filter(r => r.status === 'Offline');

  // Recuperation des donnees du robot actuellement selectionne
  const selectedRobot = formattedRobots.find(r => r.id === selectedRobotId);

  const RobotRow = ({ robot }) => (
    <div
      key={robot.id}
      className={`robot-row ${selectedRobotId === robot.id ? 'selected' : ''}`}
      onClick={() => setSelectedRobotId(robot.id)}
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
              width: robot.battery === '--' ? '0%' : `${robot.battery}%`,
              backgroundColor: '#9ca3af', // Gris par defaut sans donnees
            }}
          ></div>
        </div>
        <span>{robot.battery}%</span>
      </div>
      <div className="robot-location">{robot.location}</div>
      <div className="robot-lastseen">{robot.lastSeen}</div>
      <button 
        className="robot-action-btn" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setSelectedRobotId(robot.id);
        }}
      >
        Sélectionner
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <Card title={`Robots Fleet (${formattedRobots.length})`} span={2}>
        <div className="robots-list">
          
          <div className="robots-section">
            <h3 className="section-title online">
              <Circle size={16} fill="#22c55e" color="#22c55e" /> En ligne ({onlineRobots.length})
            </h3>
            <div className="robots-group">
              {onlineRobots.length > 0 ? (
                onlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">Aucun robot connecté au broker</p>
              )}
            </div>
          </div>

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

          <div className="robots-section">
            <h3 className="section-title offline">
              <Circle size={16} fill="#ef4444" color="#ef4444" /> Hors ligne ({offlineRobots.length})
            </h3>
            <div className="robots-group">
              {offlineRobots.length > 0 ? (
                offlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">Historique vide</p>
              )}
            </div>
          </div>

        </div>
      </Card>

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
              <strong>{selectedRobot.battery}</strong>
            </div>
            <div className="detail-row">
              <span>Localisation</span>
              <strong>{selectedRobot.location}</strong>
            </div>
            <div className="detail-row">
              <span>Dernier contact</span>
              <strong>{selectedRobot.lastSeen}</strong>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}