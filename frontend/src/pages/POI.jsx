import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useEffect, useMemo, useState } from 'react';
import {
  Battery,
  MapPin,
  DoorOpen,
  CheckCircle,
  Star,
  Trash2,
  Edit2,
  Save,
  Crosshair,
  Plus,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import MapCanvas from '../components/POIMapCanvas';
import './poi.css';

const typeIcons = {
  Charging: <Battery size={16} />,
  Zone: <MapPin size={16} />,
  Exit: <DoorOpen size={16} />,
  Checkpoint: <CheckCircle size={16} />,
  Other: <Star size={16} />,
};

const priorityColors = {
  High: 'priority-high',
  Medium: 'priority-medium',
  Low: 'priority-low',
};

const emptyForm = {
  name: '',
  type: 'Zone',
  x: 0,
  y: 0,
  description: '',
  priority: 'Medium',
};

export default function POI() {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [plansByMap, setPlansByMap] = useState({});
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoiId, setEditingPoiId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [mapMeta, setMapMeta] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetch('/api/maps')
      .then((res) => res.json())
      .then((data) => {
        if (data.maps?.length) {
          setMaps(data.maps);
          setSelectedMap(data.maps[0]);
        } else {
          setMaps([]);
          setSelectedMap(null);
        }
      })
      .catch((err) => console.error('Erreur chargement cartes:', err));
  }, []);

  useEffect(() => {
    if (!selectedMap) return;

    fetch(`/api/poi-maps/${selectedMap.name}`)
      .then((res) => res.json())
      .then((data) => {
        setPlansByMap((prev) => ({
          ...prev,
          [selectedMap.name]: Array.isArray(data.pois) ? data.pois : [],
        }));
      })
      .catch((err) => {
        console.error('Erreur chargement plan POI:', err);
        setPlansByMap((prev) => ({
          ...prev,
          [selectedMap.name]: [],
        }));
      });

    setShowAddForm(false);
    setEditingPoiId(null);
    setFormData(emptyForm);
    setZoom(1);
  }, [selectedMap]);

  const currentPois = useMemo(() => {
    if (!selectedMap) return [];
    return plansByMap[selectedMap.name] || [];
  }, [plansByMap, selectedMap]);

  const filteredPois = useMemo(() => {
    if (filterType === 'All') return currentPois;
    return currentPois.filter((poi) => poi.type === filterType);
  }, [currentPois, filterType]);

  const selectedPoi = useMemo(() => {
    return currentPois.find((poi) => poi.id === selectedPoiId) || null;
  }, [currentPois, selectedPoiId]);

  useEffect(() => {
    if (!currentPois.length) {
      setSelectedPoiId(null);
      return;
    }

    const exists = currentPois.some((poi) => poi.id === selectedPoiId);
    if (!exists) {
      setSelectedPoiId(currentPois[0].id);
    }
  }, [currentPois, selectedPoiId]);

  const updateCurrentMapPois = (updater) => {
    if (!selectedMap) return;

    setPlansByMap((prev) => {
      const current = prev[selectedMap.name] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;

      return {
        ...prev,
        [selectedMap.name]: next,
      };
    });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingPoiId(null);
    setShowAddForm(false);
  };

  const handleMapClick = ({ x, y }) => {
    setEditingPoiId(null);
    setFormData({
      name: `POI ${currentPois.length + 1}`,
      type: 'Zone',
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      description: '',
      priority: 'Medium',
    });
    setShowAddForm(true);
  };

  const handleAddOrUpdatePoi = () => {
    if (!selectedMap || !formData.name.trim()) return;

    if (editingPoiId) {
      updateCurrentMapPois((pois) =>
        pois.map((poi) =>
          poi.id === editingPoiId
            ? {
                ...poi,
                ...formData,
                updatedAt: new Date().toISOString(),
              }
            : poi
        )
      );
      setSelectedPoiId(editingPoiId);
    } else {
      const newPoi = {
        id: crypto.randomUUID(),
        ...formData,
        status: 'Active',
        visits: 0,
        created: new Date().toISOString().split('T')[0],
      };

      updateCurrentMapPois((pois) => [...pois, newPoi]);
      setSelectedPoiId(newPoi.id);
    }

    resetForm();
  };

  const handleEditPoi = (poi) => {
    setEditingPoiId(poi.id);
    setFormData({
      name: poi.name,
      type: poi.type,
      x: poi.x,
      y: poi.y,
      description: poi.description,
      priority: poi.priority,
    });
    setShowAddForm(true);
  };

  const handleDeletePoi = (poiId) => {
    updateCurrentMapPois((pois) => pois.filter((poi) => poi.id !== poiId));

    if (selectedPoiId === poiId) {
      const remaining = currentPois.filter((poi) => poi.id !== poiId);
      setSelectedPoiId(remaining[0]?.id || null);
    }

    if (editingPoiId === poiId) {
      resetForm();
    }
  };

  const handleSavePlan = async () => {
    if (!selectedMap) return;

    const payload = {
      mapName: selectedMap.name,
      metadata: mapMeta,
      pois: currentPois,
    };

    try {
      const response = await fetch('/api/poi-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      alert(`Plan de mission "${selectedMap.name}" sauvegardé avec succès.`);
    } catch (error) {
      console.error('Erreur sauvegarde plan POI:', error);
      alert('La sauvegarde du plan a échoué.');
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <DashboardLayout>
      <Card title={`Cartes disponibles (${maps.length})`} span={1}>
        <div className="poi-filters">
          {maps.length > 0 ? (
            maps.map((map) => (
              <button
                key={map.id}
                className={`filter-btn ${selectedMap?.id === map.id ? 'active' : ''}`}
                onClick={() => setSelectedMap(map)}
              >
                {map.name}
              </button>
            ))
          ) : (
            <div className="empty-pois">Aucune carte disponible</div>
          )}
        </div>

        <div className="poi-list">
          <div className="poi-toolbar">
            <div className="poi-toolbar-left">
              <span className="poi-toolbar-title">
                {selectedMap ? `POI liés à ${selectedMap.name}` : 'Sélectionne une carte'}
              </span>
            </div>

            <select
              className="poi-type-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">Tous</option>
              <option value="Charging">Charging</option>
              <option value="Zone">Zone</option>
              <option value="Exit">Exit</option>
              <option value="Checkpoint">Checkpoint</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {filteredPois.length > 0 ? (
            filteredPois.map((poi, index) => (
              <div
                key={poi.id}
                className={`poi-item ${selectedPoi?.id === poi.id ? 'active' : ''}`}
                onClick={() => setSelectedPoiId(poi.id)}
              >
                <div className="poi-item-header">
                  <span className="poi-type-icon">{typeIcons[poi.type] || typeIcons.Other}</span>

                  <div className="poi-item-title">
                    <h4>
                      {index + 1}. {poi.name}
                    </h4>
                    <span className={`priority-badge ${priorityColors[poi.priority]}`}>
                      {poi.priority}
                    </span>
                  </div>
                </div>

                <div className="poi-item-coords">
                  <span>X: {Number(poi.x).toFixed(2)} m</span>
                  <span>Y: {Number(poi.y).toFixed(2)} m</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-pois">
              Aucun POI pour cette carte. Clique sur la map pour en créer un.
            </div>
          )}
        </div>

        <div className="form-buttons">
          <button className="btn-submit" onClick={handleSavePlan} disabled={!selectedMap}>
            <Save size={14} />
            Sauvegarder le plan
          </button>

          <button
            className="btn-cancel"
            onClick={() => {
              setEditingPoiId(null);
              setFormData(emptyForm);
              setShowAddForm(true);
            }}
            disabled={!selectedMap}
          >
            <Plus size={14} />
            Ajouter manuellement
          </button>
        </div>
      </Card>

      <Card title={selectedMap ? `Plan POI : ${selectedMap.name}` : 'Plan POI'} span={2}>
        {selectedMap ? (
          <>
            <div className="poi-map-header">
              <div className="poi-map-instructions">
                <Crosshair size={16} />
                <span>Clique sur la carte pour ajouter un POI</span>
              </div>

              <div className="poi-map-controls">
                <button className="map-zoom-btn" onClick={handleZoomOut}>
                  <ZoomOut size={16} />
                </button>
                <span className="map-zoom-label">{Math.round(zoom * 100)}%</span>
                <button className="map-zoom-btn" onClick={handleZoomIn}>
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            {mapMeta && (
              <div className="poi-map-meta">
                <span>Résolution : {mapMeta.resolution} m/px</span>
                <span>
                  Origine : [{mapMeta.origin[0]}, {mapMeta.origin[1]}, {mapMeta.origin[2]}]
                </span>
                <span>
                  Pose initiale : {selectedMap?.initialPose
                    ? `[${selectedMap.initialPose.x.toFixed(2)}, ${selectedMap.initialPose.y.toFixed(2)}, ${selectedMap.initialPose.yaw.toFixed(2)}]`
                    : 'non définie'}
                </span>
              </div>
            )}

            <div className="poi-map">
              <MapCanvas
                mapName={selectedMap.name}
                pois={currentPois}
                selectedPoiId={selectedPoiId}
                initialPose={selectedMap.initialPose}
                onMapClick={handleMapClick}
                onMetaLoaded={setMapMeta}
                zoom={zoom}
              />
            </div>
          </>
        ) : (
          <div className="empty-pois">Sélectionne d’abord une carte</div>
        )}
      </Card>

      <Card title={showAddForm ? (editingPoiId ? 'Édition du POI' : 'Création du POI') : selectedPoi ? `Détails : ${selectedPoi.name}` : 'Création / édition'} span={1}>
        {showAddForm ? (
          <div className="poi-form">
            <div className="form-group">
              <label>Nom du POI</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Docking Station"
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Charging">Charging</option>
                <option value="Zone">Zone</option>
                <option value="Exit">Exit</option>
                <option value="Checkpoint">Checkpoint</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Position X (m)</label>
                <input
                  type="number"
                  value={formData.x}
                  onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value || 0) })}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Position Y (m)</label>
                <input
                  type="number"
                  value={formData.y}
                  onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value || 0) })}
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Priorité</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez ce point d’intérêt..."
                rows="4"
              />
            </div>

            <div className="form-buttons">
              <button className="btn-submit" onClick={handleAddOrUpdatePoi}>
                {editingPoiId ? (
                  <>
                    <Edit2 size={14} />
                    Mettre à jour
                  </>
                ) : (
                  <>
                    <MapPin size={14} />
                    Ajouter
                  </>
                )}
              </button>

              <button className="btn-cancel" onClick={resetForm}>
                Annuler
              </button>
            </div>
          </div>
        ) : selectedPoi ? (
          <div className="poi-details">
            <div className="detail-section">
              <h4>Informations</h4>

              <div className="detail-row">
                <span>Nom</span>
                <strong>{selectedPoi.name}</strong>
              </div>

              <div className="detail-row">
                <span>Type</span>
                <strong>{selectedPoi.type}</strong>
              </div>

              <div className="detail-row">
                <span>Priorité</span>
                <span className={`priority-badge ${priorityColors[selectedPoi.priority]}`}>
                  {selectedPoi.priority}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Coordonnées</h4>

              <div className="detail-row">
                <span>X</span>
                <strong>{Number(selectedPoi.x).toFixed(3)} m</strong>
              </div>

              <div className="detail-row">
                <span>Y</span>
                <strong>{Number(selectedPoi.y).toFixed(3)} m</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Description</h4>
              <p className="description-text">
                {selectedPoi.description || 'Aucune description renseignée.'}
              </p>
            </div>

            <div className="poi-actions">
              <button className="action-btn action-btn-edit" onClick={() => handleEditPoi(selectedPoi)}>
                <Edit2 size={14} />
                Éditer
              </button>

              <button
                className="action-btn action-btn-delete"
                onClick={() => handleDeletePoi(selectedPoi.id)}
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-pois">
            Clique sur la carte ou utilise “Ajouter manuellement” pour créer un POI.
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
