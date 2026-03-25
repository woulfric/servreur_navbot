import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState, useEffect } from 'react';
import { Map, BarChart3, Calendar } from 'lucide-react';
import MapCanvas from '../components/MapCanvas';
import { useI18n } from '../i18n/LanguageContext';
import './maps.css';

export default function Maps() {
  const { language } = useI18n();
  const [selectedMap, setSelectedMap] = useState(null);
  const [maps, setMaps] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Chargement des cartes depuis le serveur
  useEffect(() => {
    fetch('/api/maps')
      .then(res => res.json())
      .then(data => {
        if (data.maps) {
          setMaps(data.maps);
          if (data.maps.length > 0) {
            setSelectedMap(data.maps[0]); // Sélectionne la première carte par défaut
          }
        }
      })
      .catch(err => console.error("Erreur chargement cartes:", err));
  }, []);

  const handleDeleteMap = (mapId) => {
    // Ici il faudra faire un fetch DELETE vers l'API plus tard
    setMaps(maps.filter(map => map.id !== mapId));
    if (selectedMap?.id === mapId) {
      const remainingMaps = maps.filter(map => map.id !== mapId);
      setSelectedMap(remainingMaps.length > 0 ? remainingMaps[0] : null);
    }
    setShowDeleteConfirm(false);
  };

  const handleExportMap = (map) => {
    alert(`Exportation de ${map.name} en cours...`);
  };

  const handleDuplicateMap = (map) => {
    // A gérer côté serveur plus tard
    alert("Duplication à implémenter côté serveur");
  };

  const handleUploadMap = () => {
    alert('Fenêtre de sélection de fichier (à implémenter)');
  };

  return (
    <DashboardLayout>
      <Card title={`${language === 'en' ? 'Available maps' : 'Cartes disponibles'} (${maps.length})`} span={1}>
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
            <div className="empty-maps">{language === 'en' ? 'No map available on server' : 'Aucune carte disponible sur le serveur'}</div>
          )}
        </div>
      </Card>

      {selectedMap && (
        <Card title={`${language === 'en' ? 'Preview' : 'Apercu'}: ${selectedMap.name}`} span={2}>
          <div className="map-preview">
            <MapCanvas mapName={selectedMap.name} />
          </div>

          <div className="map-details">
            <div className="detail-item">
              <span>{language === 'en' ? 'Size' : 'Taille'}</span>
              <strong>{selectedMap.size}</strong>
            </div>
            <div className="detail-item">
              <span>{language === 'en' ? 'Waypoints' : 'Points de repere'}</span>
              <strong>{selectedMap.pointsCount}</strong>
            </div>
            <div className="detail-item">
              <span>{language === 'en' ? 'Active robots' : 'Robots actifs'}</span>
              <strong>{selectedMap.robotCount}</strong>
            </div>
            <div className="detail-item">
              <span>{language === 'en' ? 'Updated' : 'Modifiee'}</span>
              <strong>{selectedMap.lastModified}</strong>
            </div>
          </div>
        </Card>
      )}

      {selectedMap && (
        <Card title={language === 'en' ? 'Actions' : 'Actions'} span={1}>
          <div className="actions-grid">
            <button className="action-btn action-btn-primary" onClick={() => alert(`${language === 'en' ? 'Editing' : 'Edition'} ${selectedMap.name}`)}>
              ✏️ {language === 'en' ? 'Edit' : 'Editer'}
            </button>
            <button className="action-btn action-btn-secondary" onClick={() => handleDuplicateMap(selectedMap)}>
              📋 {language === 'en' ? 'Duplicate' : 'Dupliquer'}
            </button>
            <button className="action-btn action-btn-secondary" onClick={() => handleExportMap(selectedMap)}>
              📥 {language === 'en' ? 'Export' : 'Exporter'}
            </button>
            <button className="action-btn action-btn-warning" onClick={() => setShowDeleteConfirm(true)}>
              🗑️ {language === 'en' ? 'Delete' : 'Supprimer'}
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="delete-confirm">
              <p>{language === 'en' ? 'Are you sure you want to delete' : 'Etes-vous sur de vouloir supprimer'} <strong>{selectedMap.name}</strong>?</p>
              <div className="confirm-buttons">
                <button className="btn-danger" onClick={() => handleDeleteMap(selectedMap.id)}>
                  {language === 'en' ? 'Confirm' : 'Confirmer'}
                </button>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                  {language === 'en' ? 'Cancel' : 'Annuler'}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}
