import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Clock,
  Info,
  RotateCcw,
  Download,
  Play,
  MapPinned,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import './missions.css';

const POLL_INTERVAL_MS = 4000;
const STATUS_FILTERS = ['All', 'Pending', 'Running', 'Completed', 'Failed'];
const TERMINAL_STATUSES = new Set(['Completed', 'Failed']);

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const formatDuration = (startValue, endValue) => {
  if (!startValue) {
    return '-';
  }

  const start = new Date(startValue).getTime();
  const end = endValue ? new Date(endValue).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '-';
  }

  const totalMinutes = Math.floor((end - start) / 60000);

  if (totalMinutes < 1) {
    return '< 1 min';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${totalMinutes} min`;
};

const getRobotKey = (robot) => {
  return robot.id || robot.robotId || robot.name || '';
};

const getRobotLabel = (robot) => {
  return robot.name || robot.id || robot.robotId || 'Robot';
};

const getResultTone = (status) => {
  switch (status) {
    case 'Completed':
      return 'result-success';
    case 'Running':
      return 'result-running';
    case 'Failed':
      return 'result-failed';
    case 'Pending':
      return 'result-pending';
    default:
      return '';
  }
};

const getResultText = (status, logs) => {
  const latestLog = Array.isArray(logs) && logs.length > 0 ? logs[logs.length - 1] : null;

  if (latestLog?.message) {
    return latestLog.message;
  }

  switch (status) {
    case 'Completed':
      return 'Mission terminee';
    case 'Running':
      return 'En cours';
    case 'Failed':
      return 'Echec mission';
    case 'Pending':
      return 'Attente de lancement';
    default:
      return status;
  }
};

const getCoverageText = (status, poiCount, logs) => {
  if (status === 'Completed') {
    return '100%';
  }

  if (!poiCount || poiCount <= 0) {
    if (status === 'Running') {
      return '10%';
    }

    return '0%';
  }

  const reachedCount = logs.filter((log) => String(log.message).includes('POI atteint')).length;
  const navigationCount = logs.filter((log) =>
    String(log.message).includes('Navigation vers POI')
  ).length;

  let ratio = reachedCount / poiCount;

  if (status === 'Running' && navigationCount > reachedCount) {
    ratio = Math.max(ratio, (reachedCount + 0.5) / poiCount);
  }

  if (status === 'Failed' && ratio === 0 && logs.length > 0) {
    ratio = 0.05;
  }

  const percentage = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return `${percentage}%`;
};

const getLogToneClass = (level) => {
  switch (String(level || '').toLowerCase()) {
    case 'error':
      return 'mission-log-error';
    case 'warn':
    case 'warning':
      return 'mission-log-warn';
    default:
      return 'mission-log-info';
  }
};

export default function Missions() {
  const { language } = useI18n();
  const [robots, setRobots] = useState([]);
  const [poiMaps, setPoiMaps] = useState([]);
  const [missions, setMissions] = useState([]);
  const [missionLogsById, setMissionLogsById] = useState({});
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [missionForm, setMissionForm] = useState({
    robotId: '',
    robotName: '',
    poiPlanName: '',
  });

  const robotsById = useMemo(() => {
    return robots.reduce((accumulator, robot) => {
      const robotKey = getRobotKey(robot);

      if (robotKey) {
        accumulator[robotKey] = robot;
      }

      return accumulator;
    }, {});
  }, [robots]);

  const plansByName = useMemo(() => {
    return poiMaps.reduce((accumulator, plan) => {
      accumulator[plan.name] = plan;
      return accumulator;
    }, {});
  }, [poiMaps]);

  const syncMissionForm = (robotsList, plansList) => {
    setMissionForm((previousForm) => {
      const previousRobotExists = robotsList.some(
        (robot) => getRobotKey(robot) === previousForm.robotId
      );
      const nextRobot =
        (previousRobotExists &&
          robotsList.find((robot) => getRobotKey(robot) === previousForm.robotId)) ||
        robotsList[0] ||
        null;

      const previousPlanExists = plansList.some(
        (plan) => plan.name === previousForm.poiPlanName
      );
      const nextPlan =
        (previousPlanExists &&
          plansList.find((plan) => plan.name === previousForm.poiPlanName)) ||
        plansList[0] ||
        null;

      return {
        robotId: nextRobot ? getRobotKey(nextRobot) : '',
        robotName: nextRobot ? getRobotLabel(nextRobot) : '',
        poiPlanName: nextPlan ? nextPlan.name : '',
      };
    });
  };

  const fetchRobots = async () => {
    const response = await fetch('/api/active');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement des robots');
    }

    const robotsList = Array.isArray(data.robots) ? data.robots : [];
    setRobots(robotsList);

    return robotsList;
  };

  const fetchPoiMaps = async () => {
    const response = await fetch('/api/poi-maps');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement des plans POI');
    }

    const plans = Array.isArray(data.poiMaps) ? data.poiMaps : [];
    setPoiMaps(plans);

    return plans;
  };

  const fetchMissions = async () => {
    const response = await fetch('/api/missions');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement des missions');
    }

    const missionsList = Array.isArray(data.missions) ? data.missions : [];
    setMissions(missionsList);

    return missionsList;
  };

  const fetchMissionLogs = async (missionId, { silent = false } = {}) => {
    if (!missionId) {
      return [];
    }

    if (!silent) {
      setIsLogsLoading(true);
    }

    try {
      const response = await fetch(`/api/missions/${missionId}/logs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement des logs');
      }

      const logs = Array.isArray(data.logs) ? data.logs : [];

      setMissionLogsById((previousLogs) => ({
        ...previousLogs,
        [missionId]: logs,
      }));

      return logs;
    } catch (error) {
      console.error('Erreur chargement logs mission:', error);
      return [];
    } finally {
      if (!silent) {
        setIsLogsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      try {
        setIsInitialLoading(true);
        setErrorMessage('');

        await Promise.all([fetchRobots(), fetchPoiMaps(), fetchMissions()]);
      } catch (error) {
        console.error('Erreur initialisation missions:', error);
        if (!isCancelled) {
          setErrorMessage(error.message);
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    syncMissionForm(robots, poiMaps);
  }, [robots, poiMaps]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await Promise.all([fetchRobots(), fetchMissions()]);
      } catch (error) {
        console.error('Erreur rafraichissement missions:', error);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedMissionId((previousMissionId) => {
      const previousStillExists = missions.some(
        (mission) => mission.missionId === previousMissionId
      );

      if (previousStillExists) {
        return previousMissionId;
      }

      return missions[0]?.missionId || null;
    });
  }, [missions]);

  const selectedMissionRecord = useMemo(() => {
    return missions.find((mission) => mission.missionId === selectedMissionId) || null;
  }, [missions, selectedMissionId]);

  useEffect(() => {
    if (!selectedMissionId) {
      return undefined;
    }

    fetchMissionLogs(selectedMissionId);

    if (!selectedMissionRecord || TERMINAL_STATUSES.has(selectedMissionRecord.status)) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchMissionLogs(selectedMissionId, { silent: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [selectedMissionId, selectedMissionRecord]);

  const missionRows = useMemo(() => {
    return missions.map((mission) => {
      const robot = robotsById[mission.robotId];
      const plan = plansByName[mission.planName];
      const logs = missionLogsById[mission.missionId] || [];
      const isTerminal = TERMINAL_STATUSES.has(mission.status);

      return {
        id: mission.missionId,
        missionId: mission.missionId,
        name: `${mission.planName} - ${getRobotLabel(robot || { name: mission.robotId })}`,
        robot: getRobotLabel(robot || { name: mission.robotId }),
        robotId: mission.robotId,
        poiPlanName: mission.planName,
        mapName: mission.mapName,
        poiCount: plan?.poisCount || 0,
        status: mission.status,
        result: getResultText(mission.status, logs),
        resultTone: getResultTone(mission.status),
        startTime: formatDateTime(mission.createdAt),
        endTime: isTerminal ? formatDateTime(mission.updatedAt) : '-',
        duration: formatDuration(
          mission.createdAt,
          isTerminal ? mission.updatedAt : null
        ),
        coverage: getCoverageText(mission.status, plan?.poisCount || 0, logs),
        description: `Mission executee avec le plan "${mission.planName}" sur la carte "${mission.mapName}".`,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        logs,
      };
    });
  }, [missions, robotsById, plansByName, missionLogsById]);

  const selectedMission = useMemo(() => {
    return missionRows.find((mission) => mission.missionId === selectedMissionId) || null;
  }, [missionRows, selectedMissionId]);

  const selectedMissionLogs = selectedMission
    ? missionLogsById[selectedMission.missionId] || []
    : [];

  const filteredMissions = useMemo(() => {
    if (filterStatus === 'All') {
      return missionRows;
    }

    return missionRows.filter((mission) => mission.status === filterStatus);
  }, [filterStatus, missionRows]);

  const selectedPlan = useMemo(() => {
    return poiMaps.find((plan) => plan.name === missionForm.poiPlanName) || null;
  }, [poiMaps, missionForm.poiPlanName]);

  const canLaunchMission =
    missionForm.robotId && missionForm.robotName && missionForm.poiPlanName;

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

  const getStatusLabel = (status) => {
    if (language !== 'en') {
      return status;
    }

    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Running':
        return 'Running';
      case 'Completed':
        return 'Completed';
      case 'Failed':
        return 'Failed';
      default:
        return status;
    }
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

  const launchMission = async ({ robotId, planName }) => {
    const response = await fetch('/api/start_mission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        robotId,
        planName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du lancement de la mission');
    }

    return data;
  };

  const handleLaunchMission = async () => {
    if (!canLaunchMission) {
      return;
    }

    try {
      setIsSubmittingMission(true);
      setErrorMessage('');
      setFormMessage('');

      const data = await launchMission({
        robotId: missionForm.robotId,
        planName: missionForm.poiPlanName,
      });

      await fetchMissions();

      if (data.missionPreview?.missionId) {
        setSelectedMissionId(data.missionPreview.missionId);
      }

      setFormMessage(
        `Mission "${data.missionPreview?.missionId || missionForm.poiPlanName}" envoyee au robot.`
      );
    } catch (error) {
      console.error('Erreur lancement mission:', error);
      setErrorMessage(error.message);
    } finally {
      setIsSubmittingMission(false);
    }
  };

  const handleRetryMission = async (mission) => {
    try {
      setIsSubmittingMission(true);
      setErrorMessage('');
      setFormMessage('');

      const data = await launchMission({
        robotId: mission.robotId,
        planName: mission.poiPlanName,
      });

      await fetchMissions();

      if (data.missionPreview?.missionId) {
        setSelectedMissionId(data.missionPreview.missionId);
      }

      setFormMessage(
        `Nouvelle execution lancee pour le plan "${mission.poiPlanName}".`
      );
    } catch (error) {
      console.error('Erreur relance mission:', error);
      setErrorMessage(error.message);
    } finally {
      setIsSubmittingMission(false);
    }
  };

  const handleExportMission = (mission) => {
    const logs = missionLogsById[mission.missionId] || [];
    const reportLines = [
      `Mission ID,${mission.missionId}`,
      `Robot,${mission.robotId}`,
      `Plan,${mission.poiPlanName}`,
      `Map,${mission.mapName}`,
      `Status,${mission.status}`,
      `Start,${mission.startTime}`,
      `End,${mission.endTime}`,
      `Duration,${mission.duration}`,
      `Coverage,${mission.coverage}`,
      '',
      'Logs',
      'Timestamp,Level,Message',
      ...logs.map(
        (log) =>
          `${log.timestamp},${log.level || 'info'},"${String(log.message || '').replace(/"/g, '""')}"`
      ),
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${mission.missionId}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Card title={language === 'en' ? 'Launch a mission' : 'Lancer une mission'} span={1}>
        <div className="mission-create-panel">
          <div className="form-group">
            <label>{language === 'en' ? 'Robot' : 'Robot'}</label>
            <select
              value={missionForm.robotId}
              onChange={(event) => {
                const selectedRobot = robots.find(
                  (robot) => getRobotKey(robot) === event.target.value
                );

                setMissionForm((previousForm) => ({
                  ...previousForm,
                  robotId: event.target.value,
                  robotName: selectedRobot ? getRobotLabel(selectedRobot) : '',
                }));
              }}
            >
              {robots.length > 0 ? (
                robots.map((robot, index) => {
                  const robotValue = getRobotKey(robot) || `robot-${index}`;

                  return (
                    <option key={robotValue} value={robotValue}>
                      {getRobotLabel(robot)}
                    </option>
                  );
                })
              ) : (
                <option value="">
                  {language === 'en' ? 'No robot available' : 'Aucun robot disponible'}
                </option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>{language === 'en' ? 'POI Plan' : 'Plan POI'}</label>
            <select
              value={missionForm.poiPlanName}
              onChange={(event) =>
                setMissionForm((previousForm) => ({
                  ...previousForm,
                  poiPlanName: event.target.value,
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
                <option value="">
                  {language === 'en'
                    ? 'No POI plan available'
                    : 'Aucun plan POI disponible'}
                </option>
              )}
            </select>
          </div>

          {selectedPlan && (
            <div className="mission-plan-summary">
              <div className="summary-row">
                <span>{language === 'en' ? 'Map' : 'Carte'}</span>
                <strong>{selectedPlan.mapName}</strong>
              </div>
              <div className="summary-row">
                <span>POI</span>
                <strong>{selectedPlan.poisCount}</strong>
              </div>
              <div className="summary-row">
                <span>{language === 'en' ? 'Last update' : 'Derniere mise a jour'}</span>
                <strong>{formatDateTime(selectedPlan.updatedAt)}</strong>
              </div>
            </div>
          )}

          {formMessage ? <div className="mission-inline-note">{formMessage}</div> : null}
          {errorMessage ? <div className="mission-inline-error">{errorMessage}</div> : null}

          <button
            className="primary-mission-btn"
            onClick={handleLaunchMission}
            disabled={!canLaunchMission || isSubmittingMission}
          >
            <Play size={16} />
            {isSubmittingMission
              ? language === 'en'
                ? 'Launching...'
                : 'Lancement...'
              : language === 'en'
                ? 'Launch mission'
                : 'Lancer la mission'}
          </button>
        </div>
      </Card>

      <Card title={language === 'en' ? 'Missions' : 'Missions'} span={2}>
        <div className="missions-filters">
          {STATUS_FILTERS.map((status) => (
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
            <div className="col-plan">{language === 'en' ? 'Plan' : 'Plan'}</div>
            <div className="col-status">{language === 'en' ? 'Status' : 'Statut'}</div>
            <div className="col-duration">{language === 'en' ? 'Duration' : 'Duree'}</div>
            <div className="col-actions">Actions</div>
          </div>

          {isInitialLoading ? (
            <div className="empty-missions">
              {language === 'en' ? 'Loading missions...' : 'Chargement des missions...'}
            </div>
          ) : filteredMissions.length > 0 ? (
            filteredMissions.map((mission) => (
              <div
                key={mission.missionId}
                className={`mission-row ${selectedMission?.missionId === mission.missionId ? 'selected' : ''}`}
                onClick={() => setSelectedMissionId(mission.missionId)}
              >
                <div className="col-name">
                  <strong>{mission.missionId}</strong>
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
                    {getStatusLabel(mission.status)}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedMissionId(mission.missionId);
                    }}
                    title={language === 'en' ? 'View details' : 'Voir les details'}
                  >
                    <Info size={16} />
                  </button>

                  {mission.status === 'Failed' ? (
                    <button
                      className="action-icon-btn retry"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRetryMission(mission);
                      }}
                      title={language === 'en' ? 'Retry' : 'Relancer'}
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-missions">
              {language === 'en' ? 'No mission found' : 'Aucune mission trouvee'}
            </div>
          )}
        </div>
      </Card>

      {selectedMission ? (
        <Card
          title={`${language === 'en' ? 'Details' : 'Details'} : ${selectedMission.missionId}`}
          span={1}
        >
          <div className="mission-details">
            <div className="detail-section">
              <h4>{language === 'en' ? 'General information' : 'Informations generales'}</h4>

              <div className="detail-row">
                <span>Mission ID</span>
                <strong>{selectedMission.missionId}</strong>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'Assigned robot' : 'Robot assigne'}</span>
                <strong>{selectedMission.robot}</strong>
              </div>

              <div className="detail-row">
                <span>Plan POI</span>
                <strong>{selectedMission.poiPlanName}</strong>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'Map' : 'Carte'}</span>
                <strong>{selectedMission.mapName}</strong>
              </div>

              <div className="detail-row">
                <span>POI</span>
                <strong>{selectedMission.poiCount}</strong>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'Status' : 'Statut'}</span>
                <span className={`status-badge ${getStatusColor(selectedMission.status)}`}>
                  {getStatusIcon(selectedMission.status)}
                  {getStatusLabel(selectedMission.status)}
                </span>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'Result' : 'Resultat'}</span>
                <span className={`result-badge ${selectedMission.resultTone}`}>
                  {selectedMission.result}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>{language === 'en' ? 'Timeline' : 'Chronologie'}</h4>

              <div className="detail-row">
                <span>{language === 'en' ? 'Start' : 'Debut'}</span>
                <strong>{selectedMission.startTime}</strong>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'End' : 'Fin'}</span>
                <strong>{selectedMission.endTime}</strong>
              </div>

              <div className="detail-row">
                <span>{language === 'en' ? 'Duration' : 'Duree'}</span>
                <strong>{selectedMission.duration}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>{language === 'en' ? 'Progress' : 'Progression'}</h4>

              <div className="detail-row">
                <span>{language === 'en' ? 'Coverage' : 'Couverture'}</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: selectedMission.coverage }}
                  ></div>
                </div>
              </div>
              <div className="detail-row">
                <span></span>
                <strong>{selectedMission.coverage}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>{language === 'en' ? 'Description' : 'Description'}</h4>
              <p className="description-text">{selectedMission.description}</p>
            </div>

            <div className="detail-section">
              <h4>{language === 'en' ? 'Mission logs' : 'Logs mission'}</h4>

              {isLogsLoading && selectedMissionLogs.length === 0 ? (
                <div className="mission-logs-empty">
                  {language === 'en' ? 'Loading logs...' : 'Chargement des logs...'}
                </div>
              ) : selectedMissionLogs.length > 0 ? (
                <div className="mission-logs-list">
                  {selectedMissionLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`mission-log-item ${getLogToneClass(log.level)}`}
                    >
                      <div className="mission-log-meta">
                        <span className="mission-log-level">{log.level || 'info'}</span>
                        <span className="mission-log-time">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      <div className="mission-log-message">{log.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mission-logs-empty">
                  {language === 'en' ? 'No log available yet' : 'Aucun log disponible pour le moment'}
                </div>
              )}
            </div>

            <div className="detail-actions">
              {selectedMission.status === 'Failed' ? (
                <button
                  className="detail-btn retry-btn"
                  onClick={() => handleRetryMission(selectedMission)}
                >
                  <RotateCcw size={16} />
                  {language === 'en' ? 'Retry mission' : 'Relancer la mission'}
                </button>
              ) : null}

              <button
                className="detail-btn export-btn"
                onClick={() => handleExportMission(selectedMission)}
              >
                <Download size={16} />
                {language === 'en' ? 'Export report' : 'Exporter le rapport'}
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </DashboardLayout>
  );
}
