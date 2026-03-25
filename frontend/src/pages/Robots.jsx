import { useContext } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { Circle } from 'lucide-react';
import { RobotContext } from '../context/RobotContext';
import { useI18n } from '../i18n/LanguageContext';
import './robots.css';

export default function Robots() {
  const { robots, selectedRobotId, setSelectedRobotId } = useContext(RobotContext);
  const { language } = useI18n();

  const formatRobotType = (type) => {
    const normalizedType = String(type || 'unknown').toLowerCase();

    if (normalizedType === 'tb3') {
      return 'TurtleBot 3';
    }

    if (normalizedType === 'tb4') {
      return 'TurtleBot 4';
    }

    return language === 'en' ? 'Unknown robot' : 'Robot inconnu';
  };

  const formatCreatedAt = (value) => {
    if (!value) {
      return language === 'en' ? 'Unknown date' : 'Date inconnue';
    }

    return new Date(value).toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR');
  };

  const formattedRobots = robots.map((robot) => ({
    id: robot.id,
    name: robot.name || robot.robotId || robot.id,
    typeLabel: formatRobotType(robot.type),
    status: robot.status === 'online' ? 'Online' : 'Offline',
    source: robot.status === 'online'
      ? (language === 'en' ? 'Broker live' : 'Broker en direct')
      : 'MongoDB',
    lastSeen: robot.status === 'online'
      ? (language === 'en' ? 'Now' : 'Maintenant')
      : (language === 'en' ? 'No recent signal' : 'Aucun signal recent'),
    createdAt: formatCreatedAt(robot.createdAt),
  }));

  const onlineRobots = formattedRobots.filter(r => r.status === 'Online');
  const offlineRobots = formattedRobots.filter(r => r.status === 'Offline');

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
      <div className="robot-type">{robot.typeLabel}</div>
      <div className="robot-source">{robot.source}</div>
      <div className="robot-lastseen">{robot.lastSeen}</div>
      <button
        className="robot-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedRobotId(robot.id);
        }}
      >
        {language === 'en' ? 'Select' : 'Selectionner'}
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <Card title={`${language === 'en' ? 'Robots Fleet' : 'Flotte robots'} (${formattedRobots.length})`} span={2}>
        <div className="robots-list">
          
          <div className="robots-section">
            <h3 className="section-title online">
              <Circle size={16} fill="#22c55e" color="#22c55e" /> {language === 'en' ? 'Online' : 'En ligne'} ({onlineRobots.length})
            </h3>
            <div className="robots-group">
              {onlineRobots.length > 0 ? (
                onlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">{language === 'en' ? 'No robot connected to broker' : 'Aucun robot connecte au broker'}</p>
              )}
            </div>
          </div>

          <div className="robots-section">
            <h3 className="section-title offline">
              <Circle size={16} fill="#ef4444" color="#ef4444" /> {language === 'en' ? 'Offline' : 'Hors ligne'} ({offlineRobots.length})
            </h3>
            <div className="robots-group">
              {offlineRobots.length > 0 ? (
                offlineRobots.map(robot => <RobotRow key={robot.id} robot={robot} />)
              ) : (
                <p className="empty-state">{language === 'en' ? 'No robot saved in database' : 'Aucun robot enregistre en base'}</p>
              )}
            </div>
          </div>

        </div>
      </Card>

      {selectedRobot && (
        <Card title={`${language === 'en' ? 'Details' : 'Details'}: ${selectedRobot.name}`} span={1}>
          <div className="robot-details">
            <div className="detail-row">
              <span>Status</span>
              <strong className={`status-text status-${selectedRobot.status.toLowerCase()}`}>
                {selectedRobot.status}
              </strong>
            </div>
            <div className="detail-row">
              <span>{language === 'en' ? 'Type' : 'Type'}</span>
              <strong>{selectedRobot.typeLabel}</strong>
            </div>
            <div className="detail-row">
              <span>{language === 'en' ? 'Source' : 'Source'}</span>
              <strong>{selectedRobot.source}</strong>
            </div>
            <div className="detail-row">
              <span>{language === 'en' ? 'Last seen' : 'Dernier contact'}</span>
              <strong>{selectedRobot.lastSeen}</strong>
            </div>
            <div className="detail-row">
              <span>{language === 'en' ? 'Saved on' : 'Enregistre le'}</span>
              <strong>{selectedRobot.createdAt}</strong>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
