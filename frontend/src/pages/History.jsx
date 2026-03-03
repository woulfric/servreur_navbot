import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { Bot, Clock, Info, Download, Trash2, Check, AlertCircle } from 'lucide-react';
import './history.css';

const historyData = [
  {
    id: 1,
    missionName: 'Warehouse Patrol',
    robot: 'NavBot-01',
    date: '2025-01-15',
    time: '09:30 - 10:15',
    duration: '45 min',
    status: 'Completed',
    result: 'Success',
    coverage: 98,
    distance: 247.5,
    pointsCollected: 142,
    notes: 'Patrouille complète sans incident',
  },
  {
    id: 2,
    missionName: 'Zone Scan',
    robot: 'NavBot-03',
    date: '2025-01-14',
    time: '14:00 - 14:35',
    duration: '35 min',
    status: 'Completed',
    result: 'Success',
    coverage: 85,
    distance: 189.3,
    pointsCollected: 98,
    notes: 'Scan de la zone B réussi',
  },
  {
    id: 3,
    missionName: 'Security Route',
    robot: 'NavBot-02',
    date: '2025-01-13',
    time: '11:00 - 11:55',
    duration: '55 min',
    status: 'Completed',
    result: 'Failed',
    coverage: 60,
    distance: 156.8,
    pointsCollected: 67,
    notes: 'Batterie faible, arrêt prématuré',
  },
  {
    id: 4,
    missionName: 'Inspection Points',
    robot: 'NavBot-04',
    date: '2025-01-12',
    time: '08:00 - 09:30',
    duration: '90 min',
    status: 'Completed',
    result: 'Success',
    coverage: 100,
    distance: 342.1,
    pointsCollected: 234,
    notes: 'Tous les points d\'inspection visités',
  },
  {
    id: 5,
    missionName: 'Perimeter Check',
    robot: 'NavBot-01',
    date: '2025-01-11',
    time: '16:00 - 16:45',
    duration: '45 min',
    status: 'Completed',
    result: 'Success',
    coverage: 92,
    distance: 218.7,
    pointsCollected: 156,
    notes: 'Périmètre vérifié, pas d\'anomalies',
  },
  {
    id: 6,
    missionName: 'Map Update',
    robot: 'NavBot-03',
    date: '2025-01-10',
    time: '10:15 - 11:45',
    duration: '90 min',
    status: 'Completed',
    result: 'Success',
    coverage: 99,
    distance: 421.2,
    pointsCollected: 289,
    notes: 'Mise à jour cartographique complétée',
  },
  {
    id: 7,
    missionName: 'Zone Scan',
    robot: 'NavBot-02',
    date: '2025-01-09',
    time: '13:30 - 14:10',
    duration: '40 min',
    status: 'Completed',
    result: 'Failed',
    coverage: 45,
    distance: 98.5,
    pointsCollected: 42,
    notes: 'Erreur capteur, redémarrage nécessaire',
  },
  {
    id: 8,
    missionName: 'Warehouse Patrol',
    robot: 'NavBot-04',
    date: '2025-01-08',
    time: '09:00 - 10:00',
    duration: '60 min',
    status: 'Completed',
    result: 'Success',
    coverage: 96,
    distance: 289.3,
    pointsCollected: 201,
    notes: 'Patrouille standard réussie',
  },
];

export default function History() {
  const [history, setHistory] = useState(historyData);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterRobot, setFilterRobot] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const robots = ['All', ...new Set(history.map(h => h.robot))];

  const getStatusColor = (status) => {
    return 'status-completed';
  };

  const getResultColor = (result) => {
    return result === 'Success' ? 'result-success' : 'result-failed';
  };

  let filteredHistory = history.filter(h => {
    const robotMatch = filterRobot === 'All' || h.robot === filterRobot;
    const resultMatch = filterResult === 'All' || h.result === filterResult;
    const searchMatch =
      h.missionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.robot.toLowerCase().includes(searchTerm.toLowerCase());
    return robotMatch && resultMatch && searchMatch;
  });

  // Tri
  filteredHistory.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date) - new Date(a.date);
      case 'date-asc':
        return new Date(a.date) - new Date(b.date);
      case 'duration-desc':
        return parseInt(b.duration) - parseInt(a.duration);
      case 'coverage-desc':
        return b.coverage - a.coverage;
      default:
        return 0;
    }
  });

  const handleDeleteRecord = (id) => {
    setHistory(history.filter(h => h.id !== id));
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
  };

  const handleExportRecord = (record) => {
    const csv = `Mission,${record.missionName}\nRobot,${record.robot}\nDate,${record.date}\nDurée,${record.duration}\nRésultat,${record.result}\nCouverture,${record.coverage}%\nDistance,${record.distance}m\nPoints,${record.pointsCollected}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.missionName}-${record.date}.csv`;
    a.click();
  };

  const successCount = history.filter(h => h.result === 'Success').length;
  const failedCount = history.filter(h => h.result === 'Failed').length;
  const totalDistance = history.reduce((sum, h) => sum + h.distance, 0);
  const totalPoints = history.reduce((sum, h) => sum + h.pointsCollected, 0);

  return (
    <DashboardLayout>
      {/* Statistiques */}
      <Card title="Statistiques" span={2}>
        <div className="stats-grid">
          <div className="stat-card success">
            <div className="stat-number">{successCount}</div>
            <div className="stat-label">Succès</div>
          </div>
          <div className="stat-card failed">
            <div className="stat-number">{failedCount}</div>
            <div className="stat-label">Échecs</div>
          </div>
          <div className="stat-card distance">
            <div className="stat-number">{totalDistance.toFixed(0)}</div>
            <div className="stat-label">km parcourus</div>
          </div>
          <div className="stat-card points">
            <div className="stat-number">{totalPoints}</div>
            <div className="stat-label">Points collectés</div>
          </div>
        </div>
      </Card>

      {/* Filtres et recherche */}
      <Card title="Filtres" span={1}>
        <div className="history-controls">
          <div className="control-group">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Mission, robot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="control-group">
            <label>Robot</label>
            <select value={filterRobot} onChange={(e) => setFilterRobot(e.target.value)}>
              {robots.map(robot => (
                <option key={robot} value={robot}>{robot}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Résultat</label>
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
              <option value="All">Tous</option>
              <option value="Success">Succès</option>
              <option value="Failed">Échecs</option>
            </select>
          </div>

          <div className="control-group">
            <label>Tri</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">Date (récent)</option>
              <option value="date-asc">Date (ancien)</option>
              <option value="duration-desc">Durée (long)</option>
              <option value="coverage-desc">Couverture</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des historiques */}
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
            filteredHistory.map(record => (
              <div
                key={record.id}
                className={`history-row ${selectedRecord?.id === record.id ? 'selected' : ''}`}
                onClick={() => setSelectedRecord(record)}
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
                    {record.result === 'Success' ? <><Check size={14} /> {record.result}</> : <><AlertCircle size={14} /> {record.result}</> }
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
                    onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                    title="Détails"
                  >
                    <Info size={16} />
                  </button>
                  <button
                    className="action-icon-btn export-btn"
                    onClick={(e) => { e.stopPropagation(); handleExportRecord(record); }}
                    title="Exporter"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className="action-icon-btn delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-history">Aucun historique trouvé</div>
          )}
        </div>
      </Card>

      {/* Détails du record sélectionné */}
      {selectedRecord && (
        <Card title={`Détails: ${selectedRecord.missionName}`} span={1}>
          <div className="record-details">
            <div className="detail-section">
              <h4>Informations générales</h4>
              <div className="detail-row">
                <span>Mission</span>
                <strong>{selectedRecord.missionName}</strong>
              </div>
              <div className="detail-row">
                <span>Robot</span>
                <strong>{selectedRecord.robot}</strong>
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
                  {selectedRecord.result === 'Success' ? <><Check size={14} /> {selectedRecord.result}</> : <><AlertCircle size={14} /> {selectedRecord.result}</> }
                </span>
              </div>
              <div className="detail-row">
                <span>Durée</span>
                <strong>{selectedRecord.duration}</strong>
              </div>
              <div className="detail-row">
                <span>Distance</span>
                <strong>{selectedRecord.distance} m</strong>
              </div>
              <div className="detail-row">
                <span>Points collectés</span>
                <strong>{selectedRecord.pointsCollected}</strong>
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
              <button
                className="detail-btn delete-btn"
                onClick={() => handleDeleteRecord(selectedRecord.id)}
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
