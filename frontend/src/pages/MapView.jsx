import Card from '../components/common/Card';
import './mapView.css';
import { useRef } from 'react';

export default function MapView() {
  const svgRef = useRef(null);

  // Dimensions de l'espace
  const mapWidth = 1000;
  const mapHeight = 800;
  const scale = 2; // pixels par mètre

  // Position du robot en coordonnées réelles (mètres)
  const robotPose = {
    x: 5,      // mètres
    y: 4,      // mètres
    heading: 45, // degrés
  };

  // Convertir en pixels pour l'affichage
  const robotPixelX = robotPose.x * scale;
  const robotPixelY = robotPose.y * scale;

  return (
    <div className="map-page">
      <Card title="Map Overview" span={2}>
        <div className="map-container">
          <svg
            ref={svgRef}
            className="floorplan-svg"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Fond */}
            <rect width={mapWidth} height={mapHeight} fill="#1a2332" />

            {/* Grille de référence */}
            <defs>
              <pattern id="grid" width={scale * 2} height={scale * 2} patternUnits="userSpaceOnUse">
                <path d={`M ${scale * 2} 0 L 0 0 0 ${scale * 2}`} fill="none" stroke="#2a3f5f" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

            {/* Murs de la pièce principale */}
            <rect x="20" y="20" width="460" height="360" fill="none" stroke="#22c55e" strokeWidth="12" />

            {/* Murs intérieurs - Séparation en zones */}
            <line x1="240" y1="20" x2="240" y2="380" stroke="#22c55e" strokeWidth="8" opacity="0.6" />
            <line x1="20" y1="200" x2="480" y2="200" stroke="#22c55e" strokeWidth="8" opacity="0.6" />

            {/* Portes */}
            <circle cx="150" cy="20" r="20" fill="#64748b" opacity="0.5" />
            <circle cx="480" cy="100" r="20" fill="#64748b" opacity="0.5" />

            {/* Zones de danger/obstacles */}
            <rect x="350" y="250" width="80" height="80" fill="#ef4444" opacity="0.3" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
            <text x="355" y="295" fontSize="12" fill="#ef4444" fontWeight="bold">Obstacle</text>

            {/* Marqueurs de POI (Points of Interest) */}
            <circle cx="100" cy="300" r="15" fill="#3b82f6" opacity="0.4" stroke="#3b82f6" strokeWidth="2" />
            <text x="85" y="325" fontSize="11" fill="#3b82f6">POI 1</text>

            <circle cx="400" cy="100" r="15" fill="#3b82f6" opacity="0.4" stroke="#3b82f6" strokeWidth="2" />
            <text x="390" y="125" fontSize="11" fill="#3b82f6">POI 2</text>

            {/* Robot avec direction */}
            <g transform={`translate(${robotPixelX}, ${robotPixelY}) rotate(${robotPose.heading})`}>
              {/* Corps du robot */}
              <circle cx="0" cy="0" r="15" fill="none" stroke="#22c55e" strokeWidth="2" />
              {/* Flèche de direction */}
              <polygon points="0,-20 -8,5 0,0 8,5" fill="#22c55e" />
              {/* Lueur */}
              <circle cx="0" cy="0" r="15" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.3" r="20" />
            </g>

            {/* Échelle */}
            <g transform="translate(650, 720)">
              <line x1="0" y1="0" x2={scale * 5} y2="0" stroke="#94a3b8" strokeWidth="2" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke="#94a3b8" strokeWidth="2" />
              <line x1={scale * 5} y1="-5" x2={scale * 5} y2="5" stroke="#94a3b8" strokeWidth="2" />
              <text x={scale * 2.5} y="20" fontSize="12" fill="#94a3b8" textAnchor="middle">5m</text>
            </g>

            {/* Axes X Y */}
            <g transform="translate(50, 680)">
              <line x1="0" y1="0" x2="50" y2="0" stroke="#ef4444" strokeWidth="2" />
              <text x="55" y="5" fontSize="12" fill="#ef4444" fontWeight="bold">X</text>

              <line x1="0" y1="0" x2="0" y2="-50" stroke="#3b82f6" strokeWidth="2" />
              <text x="-15" y="-55" fontSize="12" fill="#3b82f6" fontWeight="bold">Y</text>
            </g>
          </svg>
        </div>
      </Card>

      <Card title="Robot Position">
        <ul className="map-info">
          <li><span>X</span><strong>{robotPose.x.toFixed(2)} m</strong></li>
          <li><span>Y</span><strong>{robotPose.y.toFixed(2)} m</strong></li>
          <li><span>Heading</span><strong>{robotPose.heading}°</strong></li>
          <li><span>Échelle</span><strong>{scale} px/m</strong></li>
        </ul>
      </Card>
    </div>
  );
}
