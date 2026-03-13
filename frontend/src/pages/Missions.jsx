import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Clock,
  Info,
  RotateCcw,
  Trash2,
  Square,
  Download,
  Play,
  MapPinned,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import './missions.css';

export default function Missions() {
  const [robots, setRobots] = useState([]);
  const [poiMaps, setPoiMaps] = useState([]);
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const [missionForm, setMissionForm] = useState({
    robotId: '',
    robotName: '',
    poiPlanName: '',
  });

  useEffect(() => {
    fetch('/api/active')
      .then((res) => res.json())
      .then((data) => {
        const robotsList = Array.isArray(data.robots) ? data.robots : [];
        setRobots(robotsList);

        if (robotsList.length > 0) {
          const firstRobot = robotsList[0];
          setMissionForm((prev) => ({
            ...prev,
            robotId: firstRobot.id || firstRobot.robotId || firstRobot.name || '',
            robotName: firstRobot.name || firstRobot.id || firstRobot.robotId || 'Robot',
          }));
        }
      })
      .catch((err) => {
        console.error('Erreur chargement robots:', err);
        setRobots([]);
      });

    fetch('/api/poi-maps')
      .then((res) => res.json())
      .then((data) => {
        const plans = Array.isArray(data.poiMaps) ? data.poiMaps : [];
        setPoiMaps(plans);

        if (plans.length > 0) {
          setMissionForm((prev) => ({
            ...prev,
            poiPlanName: plans[0].name,
          }));
        }
      })
      .catch((err) => {
        console.error('Erreur chargement plans POI:', err);
        setPoiMaps([]);
      });
  }, []);

  const filteredMissions = useMemo(() => {
    if (filterStatus === 'All') return missions;
    return missions.filter((mission) => mission.status === filterStatus);
  }, [missions, filterStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'Running':
        return 'status-running';
      case 'Failed':
        return 'status-failed';
      case 'Pending':
        return 'status-pending';
      default:
        return '';
    }
  };

  const getResultColor = (result) => {
    if (!result) return '';
    if (result.includes('Succès')) return 'result-success';
    if (result.includes('cours')) return 'result-running';
    if (result.includes('Échec')) return 'result-failed';
    if (result.includes('Attente')) return 'result-pending';
    return '';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 size={14} />;
      case 'Running':
        return <LoaderCircle size={14} />;
      case 'Failed':
        return <AlertTriangle size={14} />;
      case 'Pending':
        return <Clock size={14} />;
      default:
        return <Info size={14} />;
    }
  };

  const selectedPlan = useMemo(() => {
    return poiMaps.find((plan) => plan.name === missionForm.poiPlanName) || null;
  }, [poiMaps, missionForm.poiPlanName]);

  const canCreateMission =
    missionForm.robotId &&
    missionForm.robotName &&
    missionForm.poiPlanName;

  const formatNow = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  };

  const handleCreateMission = () => {
    if (!canCreateMission) return;

    const missionName = `${missionForm.poiPlanName} - ${missionForm.robotName}`;

    const newMission = {
      id: crypto.randomUUID(),
      name: missionName,
      robot: missionForm.robotName,
      robotId: missionForm.robotId,
      poiPlanName: missionForm.poiPlanName,
      mapName: selectedPlan?.mapName || 'N/A',
      poiCount: selectedPlan?.poisCount || 0,
      status: 'Pending',
      result: 'Attente de lancement',
      startTime: null,
      endTime: null,
      duration: '-',
      coverage: '0%',
      description: `Mission créée à partir du plan "${missionForm.poiPlanName}" sur la carte "${selectedPlan?.mapName || 'N/A'}".`,
    };

    setMissions((prev) => [newMission, ...prev]);
    setSelectedMission(newMission);
  };

const handleLaunchMission = async (mission) => {
  try {
    const response = await fetch('/api/start_mission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        robotId: mission.robotId,
        missionId: mission.id,
        planName: mission.poiPlanName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du lancement de la mission');
    }

    const updatedMission = {
      ...mission,
      status: 'Running',
      result: 'En cours',
      startTime: formatNow(),
      endTime: null,
      duration: '0 min',
      coverage: mission.coverage === '0%' ? '5%' : mission.coverage,
    };

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? updatedMission : m))
    );

    if (selectedMission?.id === mission.id) {
      setSelectedMission(updatedMission);
    }
  } catch (error) {
    console.error('Erreur lancement mission:', error);
    alert('Le lancement de la mission a échoué.');
  }
};

  const handleStopMission = (mission) => {
    const updatedMission = {
      ...mission,
      status: 'Failed',
      result: 'Échec - Arrêt manuel',
      endTime: formatNow(),
    };

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? updatedMission : m))
    );

    if (selectedMission?.id === mission.id) {
      setSelectedMission(updatedMission);
    }
  };

  const handleCompleteMission = (mission) => {
    const updatedMission = {
      ...mission,
      status: 'Completed',
      result: 'Succès',
      endTime: formatNow(),
      duration: mission.duration === '-' || mission.duration === '0 min' ? '12 min' : mission.duration,
      coverage: '100%',
    };

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? updatedMission : m))
    );

    if (selectedMission?.id === mission.id) {
      setSelectedMission(updatedMission);
    }
  };

  const handleRetryMission = (mission) => {
    const updatedMission = {
      ...mission,
      status: 'Running',
      result: 'En cours',
      startTime: formatNow(),
      endTime: null,
      duration: '0 min',
      coverage: '5%',
    };

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? updatedMission : m))
    );

    if (selectedMission?.id === mission.id) {
      setSelectedMission(updatedMission);
    }
  };

  const handleDeleteMission = (id) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== id));

    if (selectedMission?.id === id) {
      setSelectedMission(null);
    }
  };

  return (
    <DashboardLayout>
      <Card title="Créer une mission" span={1}>
        <div className="mission-create-panel">
          <div className="form-group">
            <label>Robot</label>
            <select
              value={missionForm.robotId}
              onChange={(e) => {
                const selected = robots.find(
                  (robot) =>
                    (robot.id || robot.robotId || robot.name || '') === e.target.value
                );

                setMissionForm((prev) => ({
                  ...prev,
                  robotId: e.target.value,
                  robotName: selected?.name || selected?.id || selected?.robotId || '',
                }));
              }}
            >
              {robots.length > 0 ? (
                robots.map((robot, index) => {
                  const robotValue = robot.id || robot.robotId || robot.name || `robot-${index}`;
                  const robotLabel = robot.name || robot.id || robot.robotId || `Robot ${index + 1}`;

                  return (
                    <option key={robotValue} value={robotValue}>
                      {robotLabel}
                    </option>
                  );
                })
              ) : (
                <option value="">Aucun robot disponible</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Plan POI</label>
            <select
              value={missionForm.poiPlanName}
              onChange={(e) =>
                setMissionForm((prev) => ({
                  ...prev,
                  poiPlanName: e.target.value,
                }))
              }
            >
              {poiMaps.length > 0 ? (
                poiMaps.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name}
                  </option>
                ))
              ) : (
                <option value="">Aucun plan POI disponible</option>
              )}
            </select>
          </div>

          {selectedPlan && (
            <div className="mission-plan-summary">
              <div className="summary-row">
                <span>Carte</span>
                <strong>{selectedPlan.mapName}</strong>
              </div>
              <div className="summary-row">
                <span>POI</span>
                <strong>{selectedPlan.poisCount}</strong>
              </div>
              <div className="summary-row">
                <span>Dernière mise à jour</span>
                <strong>{new Date(selectedPlan.updatedAt).toLocaleString()}</strong>
              </div>
            </div>
          )}

          <button
            className="primary-mission-btn"
            onClick={handleCreateMission}
            disabled={!canCreateMission}
          >
            <PlusCircle size={16} />
            Créer la mission
          </button>
        </div>
      </Card>

      <Card title="Missions" span={2}>
        <div className="missions-filters">
          {['All', 'Pending', 'Running', 'Completed', 'Failed'].map((status) => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="missions-list">
          <div className="missions-header">
            <div className="col-name">Mission</div>
            <div className="col-robot">Robot</div>
            <div className="col-plan">Plan</div>
            <div className="col-status">Statut</div>
            <div className="col-duration">Durée</div>
            <div className="col-actions">Actions</div>
          </div>

          {filteredMissions.length > 0 ? (
            filteredMissions.map((mission) => (
              <div
                key={mission.id}
                className={`mission-row ${selectedMission?.id === mission.id ? 'selected' : ''}`}
                onClick={() => setSelectedMission(mission)}
              >
                <div className="col-name">
                  <strong>{mission.name}</strong>
                </div>

                <div className="col-robot">
                  <span className="robot-badge">
                    <Bot size={16} />
                    {mission.robot}
                  </span>
                </div>

                <div className="col-plan">
                  <span className="plan-badge">
                    <MapPinned size={16} />
                    {mission.poiPlanName}
                  </span>
                </div>

                <div className="col-status">
                  <span className={`status-badge ${getStatusColor(mission.status)}`}>
                    {getStatusIcon(mission.status)}
                    {mission.status}
                  </span>
                </div>

                <div className="col-duration">
                  <span className="duration-text">
                    <Clock size={16} />
                    {mission.duration}
                  </span>
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

                  {mission.status === 'Pending' && (
                    <button
                      className="action-icon-btn launch"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchMission(mission);
                      }}
                      title="Lancer"
                    >
                      <Play size={16} />
                    </button>
                  )}

                  {mission.status === 'Running' && (
                    <button
                      className="action-icon-btn stop"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopMission(mission);
                      }}
                      title="Arrêter"
                    >
                      <Square size={16} />
                    </button>
                  )}

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

      {selectedMission && (
        <Card title={`Détails : ${selectedMission.name}`} span={1}>
          <div className="mission-details">
            <div className="detail-section">
              <h4>Informations générales</h4>

              <div className="detail-row">
                <span>Robot assigné</span>
                <strong>{selectedMission.robot}</strong>
              </div>

              <div className="detail-row">
                <span>Plan POI</span>
                <strong>{selectedMission.poiPlanName}</strong>
              </div>

              <div className="detail-row">
                <span>Carte</span>
                <strong>{selectedMission.mapName}</strong>
              </div>

              <div className="detail-row">
                <span>POI</span>
                <strong>{selectedMission.poiCount}</strong>
              </div>

              <div className="detail-row">
                <span>Statut</span>
                <span className={`status-badge ${getStatusColor(selectedMission.status)}`}>
                  {getStatusIcon(selectedMission.status)}
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
                <strong>{selectedMission.startTime || '-'}</strong>
              </div>

              <div className="detail-row">
                <span>Fin</span>
                <strong>{selectedMission.endTime || '-'}</strong>
              </div>

              <div className="detail-row">
                <span>Durée</span>
                <strong>{selectedMission.duration}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Progression</h4>

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
              {selectedMission.status === 'Pending' && (
                <button
                  className="detail-btn launch-btn"
                  onClick={() => handleLaunchMission(selectedMission)}
                >
                  <Play size={16} />
                  Lancer la mission
                </button>
              )}

              {selectedMission.status === 'Running' && (
                <>
                  <button
                    className="detail-btn stop-btn"
                    onClick={() => handleStopMission(selectedMission)}
                  >
                    <Square size={16} />
                    Arrêter
                  </button>

                  <button
                    className="detail-btn complete-btn"
                    onClick={() => handleCompleteMission(selectedMission)}
                  >
                    <CheckCircle2 size={16} />
                    Marquer comme terminée
                  </button>
                </>
              )}

              {selectedMission.status === 'Failed' && (
                <button
                  className="detail-btn retry-btn"
                  onClick={() => handleRetryMission(selectedMission)}
                >
                  <RotateCcw size={16} />
                  Relancer la mission
                </button>
              )}

              <button className="detail-btn export-btn">
                <Download size={16} />
                Exporter le rapport
              </button>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
