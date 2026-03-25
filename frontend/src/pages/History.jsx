import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useEffect, useMemo, useState } from 'react';
import { Bot, Clock, Info, Download, Check, AlertCircle } from 'lucide-react';
import './history.css';

const POLL_INTERVAL_MS = 5000;

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString();
};

const formatTimeRange = (startValue, endValue) => {
  if (!startValue) {
    return '-';
  }

  const start = new Date(startValue);

  if (!endValue) {
    return start.toLocaleTimeString();
  }

  const end = new Date(endValue);
  return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
};

const formatDuration = (startValue, endValue) => {
  if (!startValue || !endValue) {
    return '-';
  }

  const durationMs = new Date(endValue).getTime() - new Date(startValue).getTime();

  if (Number.isNaN(durationMs) || durationMs < 0) {
    return '-';
  }

  const totalMinutes = Math.floor(durationMs / 60000);

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

const getResultColor = (result) => {
  return result === 'Success' ? 'result-success' : 'result-failed';
};

const getCoverageFromStatus = (status) => {
  if (status === 'Completed') {
    return 100;
  }

  return 0;
};

export default function History() {
  const [missions, setMissions] = useState([]);
  const [logsByMissionId, setLogsByMissionId] = useState({});
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [filterRobot, setFilterRobot] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const fetchMissions = async () => {
    const response = await fetch('/api/missions');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement de l’historique');
    }

    const missionList = Array.isArray(data.missions) ? data.missions : [];
    setMissions(missionList);
    return missionList;
  };

  const fetchMissionLogs = async (missionId) => {
    if (!missionId) {
      return [];
    }

    const response = await fetch(`/api/missions/${missionId}/logs`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement des logs');
    }

    const logs = Array.isArray(data.logs) ? data.logs : [];

    setLogsByMissionId((previousLogs) => ({
      ...previousLogs,
      [missionId]: logs,
    }));

    return logs;
  };

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      try {
        const loadedMissions = await fetchMissions();

        if (isCancelled) {
          return;
        }

        setSelectedRecordId((previousRecordId) => {
          const terminalMissionExists = loadedMissions.some(
            (mission) =>
              mission.missionId === previousRecordId &&
              (mission.status === 'Completed' || mission.status === 'Failed')
          );

          if (terminalMissionExists) {
            return previousRecordId;
          }

          const latestTerminalMission = loadedMissions.find(
            (mission) => mission.status === 'Completed' || mission.status === 'Failed'
          );

          return latestTerminalMission?.missionId || null;
        });
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      }
    };

    loadHistory();

    const interval = setInterval(loadHistory, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedRecordId) {
      return;
    }

    fetchMissionLogs(selectedRecordId).catch((error) => {
      console.error('Erreur logs historique:', error);
    });
  }, [selectedRecordId]);

  const history = useMemo(() => {
    return missions
      .filter((mission) => mission.status === 'Completed' || mission.status === 'Failed')
      .map((mission) => {
        const logs = logsByMissionId[mission.missionId] || [];
        const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

        return {
          id: mission.missionId,
          missionId: mission.missionId,
          missionName: mission.planName,
          robot: mission.robotId,
          date: formatDate(mission.updatedAt || mission.createdAt),
          time: formatTimeRange(mission.createdAt, mission.updatedAt),
          duration: formatDuration(mission.createdAt, mission.updatedAt),
          status: mission.status,
          result: mission.status === 'Completed' ? 'Success' : 'Failed',
          coverage: getCoverageFromStatus(mission.status),
          notes: latestLog?.message || `Mission ${mission.status.toLowerCase()}`,
          mapName: mission.mapName,
          createdAt: mission.createdAt,
          updatedAt: mission.updatedAt,
          logs,
        };
      });
  }, [missions, logsByMissionId]);

  const robots = useMemo(() => {
    return ['All', ...new Set(history.map((record) => record.robot))];
  }, [history]);

  const filteredHistory = useMemo(() => {
    const filtered = history.filter((record) => {
      const robotMatch = filterRobot === 'All' || record.robot === filterRobot;
      const resultMatch = filterResult === 'All' || record.result === filterResult;
      const searchMatch =
        record.missionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.robot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.missionId.toLowerCase().includes(searchTerm.toLowerCase());

      return robotMatch && resultMatch && searchMatch;
    });

    filtered.sort((leftRecord, rightRecord) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(rightRecord.updatedAt) - new Date(leftRecord.updatedAt);
        case 'date-asc':
          return new Date(leftRecord.updatedAt) - new Date(rightRecord.updatedAt);
        case 'duration-desc':
          return rightRecord.duration.localeCompare(leftRecord.duration);
        case 'coverage-desc':
          return rightRecord.coverage - leftRecord.coverage;
        default:
          return 0;
      }
    });

    return filtered;
  }, [filterResult, filterRobot, history, searchTerm, sortBy]);

  const selectedRecord = useMemo(() => {
    return history.find((record) => record.missionId === selectedRecordId) || null;
  }, [history, selectedRecordId]);

  const handleExportRecord = async (record) => {
    const logs = logsByMissionId[record.missionId] || (await fetchMissionLogs(record.missionId));
    const csv = [
      `Mission ID,${record.missionId}`,
      `Plan,${record.missionName}`,
      `Robot,${record.robot}`,
      `Map,${record.mapName}`,
      `Date,${record.date}`,
      `Duree,${record.duration}`,
      `Resultat,${record.result}`,
      '',
      'Logs',
      'Timestamp,Level,Message',
      ...logs.map(
        (log) =>
          `${log.timestamp},${log.level || 'info'},"${String(log.message || '').replace(/"/g, '""')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${record.missionId}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const successCount = history.filter((record) => record.result === 'Success').length;
  const failedCount = history.filter((record) => record.result === 'Failed').length;
  const totalRecords = history.length;
  const uniqueRobotsCount = new Set(history.map((record) => record.robot)).size;

  return (
    <DashboardLayout>
      <Card title="Statistiques" span={2}>
        <div className="stats-grid">
          <div className="stat-card success">
            <div className="stat-number">{successCount}</div>
            <div className="stat-label">Succes</div>
          </div>
          <div className="stat-card failed">
            <div className="stat-number">{failedCount}</div>
            <div className="stat-label">Echecs</div>
          </div>
          <div className="stat-card distance">
            <div className="stat-number">{totalRecords}</div>
            <div className="stat-label">Missions terminees</div>
          </div>
          <div className="stat-card points">
            <div className="stat-number">{uniqueRobotsCount}</div>
            <div className="stat-label">Robots impliques</div>
          </div>
        </div>
      </Card>

      <Card title="Filtres" span={1}>
        <div className="history-controls">
          <div className="control-group">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Mission, robot..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />
          </div>

          <div className="control-group">
            <label>Robot</label>
            <select value={filterRobot} onChange={(event) => setFilterRobot(event.target.value)}>
              {robots.map((robot) => (
                <option key={robot} value={robot}>
                  {robot}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Résultat</label>
            <select value={filterResult} onChange={(event) => setFilterResult(event.target.value)}>
              <option value="All">Tous</option>
              <option value="Success">Succes</option>
              <option value="Failed">Echec</option>
            </select>
          </div>

          <div className="control-group">
            <label>Tri</label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date-desc">Date (récent)</option>
              <option value="date-asc">Date (ancien)</option>
              <option value="duration-desc">Durée</option>
              <option value="coverage-desc">Couverture</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title={`Historique (${filteredHistory.length})`} span={2}>
        <div className="history-list">
          <div className="history-header">
            <div className="col-mission">Mission</div>
            <div className="col-robot">Robot</div>
            <div className="col-date">Date</div>
            <div className="col-duration">Durée</div>
            <div className="col-result">Résultat</div>
            <div className="col-coverage">Couverture</div>
            <div className="col-actions">Actions</div>
          </div>

          {filteredHistory.length > 0 ? (
            filteredHistory.map((record) => (
              <div
                key={record.id}
                className={`history-row ${selectedRecord?.id === record.id ? 'selected' : ''}`}
                onClick={() => setSelectedRecordId(record.id)}
              >
                <div className="col-mission">
                  <strong>{record.missionName}</strong>
                </div>
                <div className="col-robot">
                  <span className="robot-badge"><Bot size={16} /> {record.robot}</span>
                </div>
                <div className="col-date">
                  <span className="date-text">{record.date}</span>
                </div>
                <div className="col-duration">
                  <span className="duration-text"><Clock size={16} /> {record.duration}</span>
                </div>
                <div className="col-result">
                  <span className={`result-badge ${getResultColor(record.result)}`}>
                    {record.result === 'Success' ? (
                      <>
                        <Check size={14} /> {record.result}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} /> {record.result}
                      </>
                    )}
                  </span>
                </div>
                <div className="col-coverage">
                  <div className="coverage-bar">
                    <div
                      className="coverage-fill"
                      style={{ width: `${record.coverage}%` }}
                    ></div>
                  </div>
                  <span className="coverage-text">{record.coverage}%</span>
                </div>
                <div className="col-actions">
                  <button
                    className="action-icon-btn info-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedRecordId(record.id);
                    }}
                    title="Détails"
                  >
                    <Info size={16} />
                  </button>
                  <button
                    className="action-icon-btn export-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleExportRecord(record);
                    }}
                    title="Exporter"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-history">Aucun historique trouvé</div>
          )}
        </div>
      </Card>

      {selectedRecord ? (
        <Card title={`Détails: ${selectedRecord.missionName}`} span={1}>
          <div className="record-details">
            <div className="detail-section">
              <h4>Informations générales</h4>
              <div className="detail-row">
                <span>Mission</span>
                <strong>{selectedRecord.missionName}</strong>
              </div>
              <div className="detail-row">
                <span>Mission ID</span>
                <strong>{selectedRecord.missionId}</strong>
              </div>
              <div className="detail-row">
                <span>Robot</span>
                <strong>{selectedRecord.robot}</strong>
              </div>
              <div className="detail-row">
                <span>Carte</span>
                <strong>{selectedRecord.mapName}</strong>
              </div>
              <div className="detail-row">
                <span>Date</span>
                <strong>{selectedRecord.date}</strong>
              </div>
              <div className="detail-row">
                <span>Heure</span>
                <strong>{selectedRecord.time}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Performance</h4>
              <div className="detail-row">
                <span>Résultat</span>
                <span className={`result-badge ${getResultColor(selectedRecord.result)}`}>
                  {selectedRecord.result === 'Success' ? (
                    <>
                      <Check size={14} /> {selectedRecord.result}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} /> {selectedRecord.result}
                    </>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span>Durée</span>
                <strong>{selectedRecord.duration}</strong>
              </div>
              <div className="detail-row">
                <span>Statut</span>
                <strong>{selectedRecord.status}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Couverture</h4>
              <div className="coverage-chart">
                <div className="coverage-bar-large">
                  <div
                    className="coverage-fill"
                    style={{ width: `${selectedRecord.coverage}%` }}
                  ></div>
                </div>
                <span className="coverage-percentage">{selectedRecord.coverage}%</span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Logs</h4>
              {selectedRecord.logs.length > 0 ? (
                <div className="history-log-list">
                  {selectedRecord.logs.map((log) => (
                    <div key={log.id} className="history-log-item">
                      <strong>{new Date(log.timestamp).toLocaleString()}</strong>
                      <span>{log.level || 'info'}</span>
                      <p>{log.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notes-box">Aucun log disponible pour cette mission.</p>
              )}
            </div>

            <div className="detail-section">
              <h4>Notes</h4>
              <p className="notes-box">{selectedRecord.notes}</p>
            </div>

            <div className="detail-actions">
              <button
                className="detail-btn export-btn"
                onClick={() => handleExportRecord(selectedRecord)}
              >
                <Download size={16} /> Exporter le rapport
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </DashboardLayout>
  );
}
