import { useEffect, useRef } from 'react';

function parseYaml(yamlText) {
  const lines = yamlText.split('\n').map((line) => line.trim());
  const data = {
    image: '',
    resolution: 0.05,
    origin: [0, 0, 0],
  };

  lines.forEach((line) => {
    if (!line || line.startsWith('#')) return;

    const [rawKey, ...rest] = line.split(':');
    const key = rawKey?.trim();
    const value = rest.join(':').trim();

    if (key === 'image') data.image = value;
    if (key === 'resolution') data.resolution = parseFloat(value);

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

  return { width, height, pixels };
}

function drawInitialPoseMarker(ctx, meta, mapHeight, initialPose) {
  if (!initialPose || !meta) {
    return;
  }

  const px = (initialPose.x - meta.origin[0]) / meta.resolution;
  const py = mapHeight - (initialPose.y - meta.origin[1]) / meta.resolution;

  if (Number.isNaN(px) || Number.isNaN(py)) {
    return;
  }

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

export default function MapCanvas({ mapName, initialPose = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!mapName) return;

    const loadMap = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const baseUrl = 'http://localhost:3000';

      const [pgmRes, yamlRes] = await Promise.all([
        fetch(`${baseUrl}/maps/${mapName}.pgm`),
        fetch(`${baseUrl}/maps/${mapName}.yaml`),
      ]);

      if (!pgmRes.ok) {
        throw new Error('Fichier PGM introuvable sur le serveur');
      }

      if (!yamlRes.ok) {
        throw new Error('Fichier YAML introuvable sur le serveur');
      }

      const [pgmBuffer, yamlText] = await Promise.all([
        pgmRes.arrayBuffer(),
        yamlRes.text(),
      ]);

      const { width, height, pixels } = readPgm(pgmBuffer);
      const meta = parseYaml(yamlText);

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
      drawInitialPoseMarker(ctx, meta, height, initialPose);
    };

    loadMap()
      .catch((err) => console.error('Erreur de rendu PGM:', err));
  }, [mapName, initialPose]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0b0f18',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        border: '1px solid #2a3f5f',
        borderRadius: '8px',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: 'pixelated',
          width: 'auto',
          height: '100%',
          maxHeight: '100%',
          maxWidth: '100%',
        }}
      />
    </div>
  );
}
