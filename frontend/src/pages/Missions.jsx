import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { Bot, Clock, Info, RotateCcw, Trash2, Square, Download } from 'lucide-react';
import './missions.css';

const missionsData = [
  {
    id: 1,
    name: 'Warehouse Patrol',
    robot: 'NavBot-01',
    status: 'Completed',
    result: 'Succès',
    startTime: '2025-01-19 09:30',
    endTime: '2025-01-19 10:15',
    duration: '45 min',
    coverage: '98%',
    description: 'Patrouille complète de l\'entrepôt avec cartographie SLAM',
  },
  {
    id: 2,
    name: 'Zone Scan',
    robot: 'NavBot-03',
    status: 'Running',
    result: 'En cours',
    startTime: '2025-01-19 11:00',
    endTime: null,
    duration: '15 min',
    coverage: '45%',
    description: 'Scan de la zone B pour détection d\'obstacles',
  },
  {
    id: 3,
    name: 'Inspection Points',
    robot: 'NavBot-02',
    status: 'Failed',
    result: 'Échec - Batterie faible',
    startTime: '2025-01-19 08:00',
    endTime: '2025-01-19 08:35',
    duration: '35 min',
    coverage: '60%',
    description: 'Inspection des points d\'intérêt critiques',
  },
  {
    id: 4,
    name: 'Map Update',
    robot: 'NavBot-04',
    status: 'Completed',
    result: 'Succès',
    startTime: '2025-01-18 14:20',
    endTime: '2025-01-18 15:10',
    duration: '50 min',
    coverage: '100%',
    description: 'Mise à jour de la cartographie de l\'étage 2',
  },
  {
    id: 5,
    name: 'Perimeter Check',
    robot: 'NavBot-01',
    status: 'Completed',
    result: 'Succès',
    startTime: '2025-01-18 10:00',
    endTime: '2025-01-18 11:30',
    duration: '90 min',
    coverage: '99%',
    description: 'Vérification du périmètre extérieur',
  },
];

export default function Missions() {
  const [missions, setMissions] = useState(missionsData);
  const [selectedMission, setSelectedMission] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'Running':
        return 'status-running';
      case 'Failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  const getResultColor = (result) => {
    if (result.includes('Succès')) return 'result-success';
    if (result.includes('cours')) return 'result-running';
    if (result.includes('Échec')) return 'result-failed';
    return '';
  };

  const filteredMissions = filterStatus === 'All' 
    ? missions 
    : missions.filter(m => m.status === filterStatus);

  const handleDeleteMission = (id) => {
    setMissions(missions.filter(m => m.id !== id));
    if (selectedMission?.id === id) {
      setSelectedMission(null);
    }
  };

  const handleRetryMission = (mission) => {
    alert(`Relance de la mission "${mission.name}"`);
  };

  return (
    <DashboardLayout>
      {/* Filtres */}
      <Card title="Missions" span={2}>
        <div className="missions-filters">
          {['All', 'Completed', 'Running', 'Failed'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Liste des missions */}
        <div className="missions-list">
          <div className="missions-header">
            <div className="col-name">Nom</div>
            <div className="col-robot">Robot</div>
            <div className="col-status">Statut</div>
            <div className="col-result">Résultat</div>
            <div className="col-duration">Durée</div>
            <div className="col-actions">Actions</div>
          </div>

          {filteredMissions.length > 0 ? (
            filteredMissions.map(mission => (
              <div
                key={mission.id}
                className={`mission-row ${selectedMission?.id === mission.id ? 'selected' : ''}`}
                onClick={() => setSelectedMission(mission)}
              >
                <div className="col-name">
                  <strong>{mission.name}</strong>
                </div>
                <div className="col-robot">
                  <span className="robot-badge"><Bot size={16} /> {mission.robot}</span>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${getStatusColor(mission.status)}`}>
                    {mission.status}
                  </span>
                </div>
                <div className="col-result">
                  <span className={`result-badge ${getResultColor(mission.result)}`}>
                    {mission.result}
                  </span>
                </div>
                <div className="col-duration">
                  <span className="duration-text"><Clock size={16} /> {mission.duration}</span>
                </div>
                <div className="col-actions">
                  <button
                    className="action-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMission(mission);
                    }}
                    title="Voir les détails"
                  >
                    <Info size={16} />
                  </button>
                  {mission.status === 'Failed' && (
                    <button
                      className="action-icon-btn retry"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryMission(mission);
                      }}
                      title="Relancer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    className="action-icon-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMission(mission.id);
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-missions">Aucune mission trouvée</div>
          )}
        </div>
      </Card>

      {/* Détails de la mission sélectionnée */}
      {selectedMission && (
        <Card title={`Détails: ${selectedMission.name}`} span={1}>
          <div className="mission-details">
            <div className="detail-section">
              <h4>Informations généales</h4>
              <div className="detail-row">
                <span>Robot assigné</span>
                <strong>{selectedMission.robot}</strong>
              </div>
              <div className="detail-row">
                <span>Statut</span>
                <span className={`status-badge ${getStatusColor(selectedMission.status)}`}>
                  {selectedMission.status}
                </span>
              </div>
              <div className="detail-row">
                <span>Résultat</span>
                <span className={`result-badge ${getResultColor(selectedMission.result)}`}>
                  {selectedMission.result}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Chronologie</h4>
              <div className="detail-row">
                <span>Début</span>
                <strong>{selectedMission.startTime}</strong>
              </div>
              {selectedMission.endTime && (
                <div className="detail-row">
                  <span>Fin</span>
                  <strong>{selectedMission.endTime}</strong>
                </div>
              )}
              <div className="detail-row">
                <span>Durée</span>
                <strong>{selectedMission.duration}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Performance</h4>
              <div className="detail-row">
                <span>Couverture</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${selectedMission.coverage}` }}
                  ></div>
                </div>
              </div>
              <div className="detail-row">
                <span></span>
                <strong>{selectedMission.coverage}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Description</h4>
              <p className="description-text">{selectedMission.description}</p>
            </div>

            <div className="detail-actions">
              {selectedMission.status === 'Failed' && (
                <button className="detail-btn retry-btn" onClick={() => handleRetryMission(selectedMission)}>
                  <RotateCcw size={16} /> Relancer la mission
                </button>
              )}
              {selectedMission.status === 'Running' && (
                <button className="detail-btn stop-btn">
                  <Square size={16} /> Arrêter
                </button>
              )}
              <button className="detail-btn export-btn">
                <Download size={16} /> Exporter le rapport
              </button>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
