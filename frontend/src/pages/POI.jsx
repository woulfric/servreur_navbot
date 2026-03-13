import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useState } from 'react';
import { Battery, MapPin, DoorOpen, CheckCircle, Star, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import './poi.css';

const poisData = [
  {
    id: 1,
    name: 'Docking Station',
    type: 'Charging',
    x: 12.5,
    y: 9.3,
    description: 'Station de recharge principale',
    priority: 'High',
    status: 'Active',
    visits: 142,
    created: '2025-01-01',
  },
  {
    id: 2,
    name: 'Loading Zone',
    type: 'Zone',
    x: 5.1,
    y: 14.7,
    description: 'Zone de chargement des objets',
    priority: 'Medium',
    status: 'Active',
    visits: 89,
    created: '2025-01-05',
  },
  {
    id: 3,
    name: 'Emergency Exit',
    type: 'Exit',
    x: 1.2,
    y: 18.5,
    description: 'Sortie de secours',
    priority: 'High',
    status: 'Active',
    visits: 12,
    created: '2025-01-10',
  },
  {
    id: 4,
    name: 'Inspection Point',
    type: 'Checkpoint',
    x: 8.7,
    y: 12.1,
    description: 'Point d\'inspection des objets',
    priority: 'Medium',
    status: 'Active',
    visits: 67,
    created: '2025-01-08',
  },
  {
    id: 5,
    name: 'Maintenance Area',
    type: 'Zone',
    x: 18.3,
    y: 2.5,
    description: 'Zone de maintenance des robots',
    priority: 'Low',
    status: 'Inactive',
    visits: 0,
    created: '2025-01-15',
  },
];

const typeIcons = {
  'Charging': <Battery size={16} />,
  'Zone': <MapPin size={16} />,
  'Exit': <DoorOpen size={16} />,
  'Checkpoint': <CheckCircle size={16} />,
  'Other': <Star size={16} />,
};

const priorityColors = {
  'High': 'priority-high',
  'Medium': 'priority-medium',
  'Low': 'priority-low',
};

export default function POI() {
  const [pois, setPois] = useState(poisData);
  const [selectedPoi, setSelectedPoi] = useState(pois[0]);
  const [filterType, setFilterType] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingPoi, setEditingPoi] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Zone',
    x: 0,
    y: 0,
    description: '',
    priority: 'Medium',
  });

  const filteredPois = filterType === 'All' 
    ? pois 
    : pois.filter(p => p.type === filterType);

  const handleDeletePoi = (id) => {
    setPois(pois.filter(p => p.id !== id));
    if (selectedPoi?.id === id) {
      setSelectedPoi(pois.length > 1 ? pois[0] : null);
    }
    setShowDeleteConfirm(null);
  };

  const handleAddPoi = () => {
    if (editingPoi) {
      // Édition
      setPois(pois.map(p => p.id === editingPoi.id ? { ...editingPoi, ...formData } : p));
      setEditingPoi(null);
    } else {
      // Ajout
      const newPoi = {
        id: Math.max(...pois.map(p => p.id), 0) + 1,
        ...formData,
        status: 'Active',
        visits: 0,
        created: new Date().toISOString().split('T')[0],
      };
      setPois([...pois, newPoi]);
    }
    setFormData({ name: '', type: 'Zone', x: 0, y: 0, description: '', priority: 'Medium' });
    setShowAddForm(false);
  };

  const handleEditPoi = (poi) => {
    setEditingPoi(poi);
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

  const handleToggleStatus = (poi) => {
    setPois(pois.map(p => 
      p.id === poi.id 
        ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' }
        : p
    ));
  };

  return (
    <DashboardLayout>
      {/* Liste des POI */}
      <Card title={`Points d'Intérêt (${pois.length})`} span={1}>
        <div className="poi-filters">
          {['All', 'Charging', 'Zone', 'Exit', 'Checkpoint'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="poi-list">
          {filteredPois.length > 0 ? (
            filteredPois.map(poi => (
              <div
                key={poi.id}
                className={`poi-item ${selectedPoi?.id === poi.id ? 'active' : ''}`}
                onClick={() => setSelectedPoi(poi)}
              >
                <div className="poi-item-header">
                  <span className="poi-type-icon">{typeIcons[poi.type] || typeIcons['Other']}</span>
                  <div className="poi-item-title">
                    <h4>{poi.name}</h4>
                    <span className={`priority-badge ${priorityColors[poi.priority]}`}>
                      {poi.priority}
                    </span>
                  </div>
                  <span className={`status-dot status-${poi.status.toLowerCase()}`}></span>
                </div>
                <div className="poi-item-coords">
                  <span>📍 X: {poi.x.toFixed(1)}m</span>
                  <span>📍 Y: {poi.y.toFixed(1)}m</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-pois">Aucun POI trouvé</div>
          )}
        </div>

        <button className="btn-new-poi" onClick={() => { setShowAddForm(true); setEditingPoi(null); setFormData({ name: '', type: 'Zone', x: 0, y: 0, description: '', priority: 'Medium' }); }}>
          ➕ Ajouter un POI
        </button>
      </Card>

      {/* Visualisation sur la carte */}
      {selectedPoi && (
        <Card title={`Carte: ${selectedPoi.name}`} span={1}>
          <div className="poi-map">
            <svg className="poi-svg" viewBox="0 0 1000 800">
              {/* Fond */}
              <rect width="1000" height="800" fill="#1a2332" />

              {/* Grille */}
              <defs>
                <pattern id="grid-poi" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a3f5f" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="1000" height="800" fill="url(#grid-poi)" />

              {/* Tous les POI */}
              {pois.map(poi => (
                <g key={poi.id}>
                  <circle
                    cx={poi.x * 50}
                    cy={poi.y * 50}
                    r={poi.id === selectedPoi.id ? 30 : 20}
                    fill={poi.id === selectedPoi.id ? '#22c55e' : '#3b82f6'}
                    opacity={poi.id === selectedPoi.id ? 0.3 : 0.2}
                  />
                  <circle
                    cx={poi.x * 50}
                    cy={poi.y * 50}
                    r={poi.id === selectedPoi.id ? 25 : 15}
                    fill="none"
                    stroke={poi.id === selectedPoi.id ? '#22c55e' : '#3b82f6'}
                    strokeWidth={poi.id === selectedPoi.id ? 3 : 2}
                  />
                  <text
                    x={poi.x * 50}
                    y={poi.y * 50 + 5}
                    textAnchor="middle"
                    fontSize="20"
                    fill="white"
                  >
                    {typeIcons[poi.type]}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </Card>
      )}

      {/* Détails du POI sélectionné */}
      {selectedPoi && (
        <Card title={`Détails: ${selectedPoi.name}`} span={1}>
          <div className="poi-details">
            <div className="detail-section">
              <h4>Informations</h4>
              <div className="detail-row">
                <span>Type</span>
                <strong>{selectedPoi.type}</strong>
              </div>
              <div className="detail-row">
                <span>Statut</span>
                <span className={`status-badge status-${selectedPoi.status.toLowerCase()}`}>
                  {selectedPoi.status}
                </span>
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
                <span>Position X</span>
                <strong>{selectedPoi.x.toFixed(2)} m</strong>
              </div>
              <div className="detail-row">
                <span>Position Y</span>
                <strong>{selectedPoi.y.toFixed(2)} m</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Statistiques</h4>
              <div className="detail-row">
                <span>Visites</span>
                <strong>{selectedPoi.visits}</strong>
              </div>
              <div className="detail-row">
                <span>Créé</span>
                <strong>{selectedPoi.created}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Description</h4>
              <p className="description-text">{selectedPoi.description}</p>
            </div>

            <div className="poi-actions">
              <button
                className="action-btn action-btn-edit"
                onClick={() => handleEditPoi(selectedPoi)}
              >
                ✏️ Éditer
              </button>
              <button
                className="action-btn action-btn-toggle"
                onClick={() => handleToggleStatus(selectedPoi)}
              >
                {selectedPoi.status === 'Active' ? <><Pause size={14} /> Désactiver</> : <><Play size={14} /> Activer</>}
              </button>
              <button
                className="action-btn action-btn-delete"
                onClick={() => setShowDeleteConfirm(selectedPoi.id)}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>

            {showDeleteConfirm === selectedPoi.id && (
              <div className="delete-confirm">
                <p>Êtes-vous sûr de vouloir supprimer <strong>{selectedPoi.name}</strong>?</p>
                <div className="confirm-buttons">
                  <button className="btn-danger" onClick={() => handleDeletePoi(selectedPoi.id)}>
                    Confirmer
                  </button>
                  <button className="btn-cancel" onClick={() => setShowDeleteConfirm(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Formulaire ajout/édition */}
      {showAddForm && (
        <Card title={editingPoi ? `Éditer: ${editingPoi.name}` : 'Ajouter un POI'} span={1}>
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
                  onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Position Y (m)</label>
                <input
                  type="number"
                  value={formData.y}
                  onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
                  step="0.1"
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
                placeholder="Décrivez ce POI..."
                rows="3"
              />
            </div>

            <div className="form-buttons">
              <button className="btn-submit" onClick={handleAddPoi}>
                {editingPoi ? <><Battery size={14} /> Mettre à jour</> : <><MapPin size={14} /> Ajouter</>}
              </button>
              <button className="btn-cancel" onClick={() => { setShowAddForm(false); setEditingPoi(null); }}>
                Annuler
              </button>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
