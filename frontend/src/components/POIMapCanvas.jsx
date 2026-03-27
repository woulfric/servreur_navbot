import { useEffect, useMemo, useRef, useState } from 'react';

function parseYaml(yamlText) {
  const lines = yamlText.split('\n').map((line) => line.trim());

  const data = {
    image: '',
    resolution: 0.05,
    origin: [0, 0, 0],
    negate: 0,
    occupied_thresh: 0.65,
    free_thresh: 0.196,
  };

  lines.forEach((line) => {
    if (!line || line.startsWith('#')) return;

    const [rawKey, ...rest] = line.split(':');
    const key = rawKey?.trim();
    const value = rest.join(':').trim();

    if (key === 'image') data.image = value;
    if (key === 'resolution') data.resolution = parseFloat(value);
    if (key === 'negate') data.negate = parseInt(value, 10);
    if (key === 'occupied_thresh') data.occupied_thresh = parseFloat(value);
    if (key === 'free_thresh') data.free_thresh = parseFloat(value);

    if (key === 'origin') {
      const cleaned = value.replace('[', '').replace(']', '');
      data.origin = cleaned.split(',').map((v) => parseFloat(v.trim()));
    }
  });

  return data;
}

function readPgm(buffer) {
  const view = new Uint8Array(buffer);
  let offset = 0;

  const readToken = () => {
    let token = '';

    while (offset < view.length) {
      if (view[offset] === 35) {
        while (offset < view.length && view[offset] !== 10) offset++;
      } else if (view[offset] <= 32) {
        offset++;
      } else {
        break;
      }
    }

    while (offset < view.length && view[offset] > 32) {
      token += String.fromCharCode(view[offset]);
      offset++;
    }

    return token;
  };

  const magic = readToken();
  const width = parseInt(readToken(), 10);
  const height = parseInt(readToken(), 10);
  const maxVal = parseInt(readToken(), 10);

  while (offset < view.length && view[offset] <= 32) {
    offset++;
  }

  if (magic !== 'P5') {
    throw new Error(`Format PGM non supporté : ${magic}`);
  }

  if (isNaN(width) || isNaN(height) || isNaN(maxVal)) {
    throw new Error('Header PGM invalide');
  }

  const pixels = view.slice(offset, offset + width * height);

  return { width, height, maxVal, pixels };
}

export default function POIMapCanvas({
  mapName,
  pois = [],
  selectedPoiId = null,
  initialPose = null,
  onMapClick,
  onMetaLoaded,
  zoom = 1,
}) {
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);

  useEffect(() => {
    if (!mapName) return;

    const loadMap = async () => {
      try {
        const baseUrl = 'http://localhost:3000';

        const [pgmRes, yamlRes] = await Promise.all([
          fetch(`${baseUrl}/maps/${mapName}.pgm`),
          fetch(`${baseUrl}/maps/${mapName}.yaml`),
        ]);

        if (!pgmRes.ok) {
          throw new Error('Impossible de charger le fichier PGM');
        }

        if (!yamlRes.ok) {
          throw new Error('Impossible de charger le fichier YAML');
        }

        const [pgmBuffer, yamlText] = await Promise.all([
          pgmRes.arrayBuffer(),
          yamlRes.text(),
        ]);

        const pgm = readPgm(pgmBuffer);
        const yaml = parseYaml(yamlText);

        const fullMapData = {
          ...pgm,
          meta: yaml,
        };

        setMapData(fullMapData);
        onMetaLoaded?.(yaml);
      } catch (err) {
        console.error('Erreur de rendu PGM:', err);
      }
    };

    loadMap();
  }, [mapName, onMetaLoaded]);

  useEffect(() => {
    if (!mapData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height, pixels, meta } = mapData;

    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const val = pixels[i] ?? 205;
      const idx = i * 4;

      imageData.data[idx] = val;
      imageData.data[idx + 1] = val;
      imageData.data[idx + 2] = val;
      imageData.data[idx + 3] = 255;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);

    if (initialPose) {
      const px = (initialPose.x - meta.origin[0]) / meta.resolution;
      const py = height - (initialPose.y - meta.origin[1]) / meta.resolution;

      if (!Number.isNaN(px) && !Number.isNaN(py)) {
        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.fillStyle = '#f97316';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(px - 10, py);
        ctx.lineTo(px + 10, py);
        ctx.moveTo(px, py - 10);
        ctx.lineTo(px, py + 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.stroke();

        const yaw = Number(initialPose.yaw || 0);
        const dirX = Math.cos(yaw) * 18;
        const dirY = -Math.sin(yaw) * 18;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dirX, py + dirY);
        ctx.stroke();

        ctx.font = '12px Arial';
        ctx.fillText('Start', px + 16, py - 14);
        ctx.restore();
      }
    }

    pois.forEach((poi, index) => {
      const px = (poi.x - meta.origin[0]) / meta.resolution;
      const py = height - (poi.y - meta.origin[1]) / meta.resolution;

      if (Number.isNaN(px) || Number.isNaN(py)) return;

      const isSelected = poi.id === selectedPoiId;

      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#22c55e' : '#3b82f6';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 12 : 10, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#22c55e' : '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`${index + 1}`, px + 10, py - 10);
    });
  }, [initialPose, mapData, pois, selectedPoiId]);

  const handleClick = (event) => {
    if (!mapData || !onMapClick || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = mapData.width / rect.width;
    const scaleY = mapData.height / rect.height;

    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    const worldX = mapData.meta.origin[0] + pixelX * mapData.meta.resolution;
    const worldY =
      mapData.meta.origin[1] + (mapData.height - pixelY) * mapData.meta.resolution;

    onMapClick({
      x: worldX,
      y: worldY,
      pixelX,
      pixelY,
    });
  };

  const cursorStyle = useMemo(() => {
    return onMapClick ? 'crosshair' : 'default';
  }, [onMapClick]);

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        background: '#0b0f18',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto',
        border: '1px solid #2a3f5f',
        borderRadius: '8px',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          imageRendering: 'pixelated',
          width: `${zoom * 100}%`,
          height: 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
          cursor: cursorStyle,
        }}
      />
    </div>
  );
}
