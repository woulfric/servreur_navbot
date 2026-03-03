import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { Map, BarChart3, Calendar } from 'lucide-react';
import './maps.css';

const mapsData = [
  {
    id: 1,
    name: 'Étage 1',
    description: 'Plan du premier étage',
    size: '2.4 MB',
    created: '2025-01-15',
    lastModified: '2025-01-18',
    robotCount: 3,
    pointsCount: 127,
  },
  {
    id: 2,
    name: 'Étage 2',
    description: 'Plan du deuxième étage',
    size: '1.8 MB',
    created: '2025-01-10',
    lastModified: '2025-01-17',
    robotCount: 1,
    pointsCount: 95,
  },
  {
    id: 3,
    name: 'Zone Externe',
    description: 'Parcours extérieur',
    size: '3.2 MB',
    created: '2025-01-05',
    lastModified: '2025-01-16',
    robotCount: 2,
    pointsCount: 234,
  },
  {
    id: 4,
    name: 'Laboratoire',
    description: 'Zone de test des robots',
    size: '0.9 MB',
    created: '2025-01-01',
    lastModified: '2025-01-12',
    robotCount: 0,
    pointsCount: 42,
  },
];

export default function Maps() {
  const [selectedMap, setSelectedMap] = useState(mapsData[0]);
  const [maps, setMaps] = useState(mapsData);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteMap = (mapId) => {
    setMaps(maps.filter(map => map.id !== mapId));
    if (selectedMap.id === mapId) {
      setSelectedMap(maps.length > 1 ? maps[0] : null);
    }
    setShowDeleteConfirm(false);
  };

  const handleExportMap = (map) => {
    alert(`Exportation de ${map.name} en cours...`);
  };

  const handleDuplicateMap = (map) => {
    const newMap = {
      ...map,
      id: Math.max(...maps.map(m => m.id)) + 1,
      name: `${map.name} (Copie)`,
      created: new Date().toISOString().split('T')[0],
    };
    setMaps([...maps, newMap]);
  };

  const handleUploadMap = () => {
    alert('Fenêtre de sélection de fichier (à implémenter)');
  };

  return (
    <DashboardLayout>
      {/* Liste des maps */}
      <Card title={`Cartes disponibles (${maps.length})`} span={1}>
        <div className="maps-list">
          {maps.length > 0 ? (
            maps.map(map => (
              <div
                key={map.id}
                className={`map-item ${selectedMap?.id === map.id ? 'active' : ''}`}
                onClick={() => setSelectedMap(map)}
              >
                <div className="map-item-icon"><Map size={24} /></div>
                <div className="map-item-info">
                  <h4>{map.name}</h4>
                  <p className="map-description">{map.description}</p>
                  <div className="map-meta">
                    <span><BarChart3 size={14} /> {map.pointsCount} pts</span>
                    <span><Calendar size={14} /> {map.created}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-maps">Aucune carte disponible</div>
          )}
        </div>
      </Card>

      {/* Visualisation de la map sélectionnée */}
      {selectedMap && (
        <Card title={`Aperçu: ${selectedMap.name}`} span={2}>
          <div className="map-preview">
            <svg className="floorplan-svg" viewBox="0 0 1000 800">
              {/* Fond */}
              <rect width="1000" height="800" fill="#1a2332" />

              {/* Grille */}
              <defs>
                <pattern id="grid-preview" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a3f5f" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="1000" height="800" fill="url(#grid-preview)" />

              {/* Murs */}
              <rect x="50" y="50" width="900" height="700" fill="none" stroke="#22c55e" strokeWidth="12" />
              <line x1="350" y1="50" x2="350" y2="750" stroke="#22c55e" strokeWidth="8" opacity="0.6" />
              <line x1="650" y1="50" x2="650" y2="750" stroke="#22c55e" strokeWidth="8" opacity="0.6" />

              {/* Points d'intérêt */}
              {[...Array(selectedMap.pointsCount)].map((_, i) => (
                <circle
                  key={i}
                  cx={100 + Math.random() * 800}
                  cy={100 + Math.random() * 600}
                  r="4"
                  fill="#3b82f6"
                  opacity="0.5"
                />
              ))}
            </svg>
          </div>

          <div className="map-details">
            <div className="detail-item">
              <span>Taille</span>
              <strong>{selectedMap.size}</strong>
            </div>
            <div className="detail-item">
              <span>Points de repère</span>
              <strong>{selectedMap.pointsCount}</strong>
            </div>
            <div className="detail-item">
              <span>Robots actifs</span>
              <strong>{selectedMap.robotCount}</strong>
            </div>
            <div className="detail-item">
              <span>Modifiée</span>
              <strong>{selectedMap.lastModified}</strong>
            </div>
          </div>
        </Card>
      )}

      {/* Actions sur la map */}
      {selectedMap && (
        <Card title="Actions" span={1}>
          <div className="actions-grid">
            <button className="action-btn action-btn-primary" onClick={() => alert(`Édition de ${selectedMap.name}`)}>
              ✏️ Éditer
            </button>
            <button className="action-btn action-btn-secondary" onClick={() => handleDuplicateMap(selectedMap)}>
              📋 Dupliquer
            </button>
            <button className="action-btn action-btn-secondary" onClick={() => handleExportMap(selectedMap)}>
              📥 Exporter
            </button>
            <button className="action-btn action-btn-warning" onClick={() => setShowDeleteConfirm(true)}>
              🗑️ Supprimer
            </button>
          </div>

          {/* Confirmation suppression */}
          {showDeleteConfirm && (
            <div className="delete-confirm">
              <p>Êtes-vous sûr de vouloir supprimer <strong>{selectedMap.name}</strong>?</p>
              <div className="confirm-buttons">
                <button className="btn-danger" onClick={() => handleDeleteMap(selectedMap.id)}>
                  Confirmer
                </button>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Ajouter une nouvelle map */}
      <Card title="Nouvelle carte" span={1}>
        <button className="btn-add-map" onClick={handleUploadMap}>
          ➕ Importer une carte
        </button>
      </Card>
    </DashboardLayout>
  );
}
