import { useEffect, useRef } from 'react';

export default function MapCanvas({ mapName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!mapName) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mapUrl = `http://localhost:3000/maps/${mapName}.pgm`;
    fetch(mapUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Fichier introuvable sur le serveur');
        return res.arrayBuffer();
      })
      .then((buffer) => {
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

        const pixels = view.slice(offset);

        console.log('magic:', magic);
        console.log('width:', width);
        console.log('height:', height);
        console.log('maxVal:', maxVal);
        console.log('offset:', offset);
        console.log('pixels length:', pixels.length);
        console.log('width x height:', width * height);
        console.log('premiers pixels:', Array.from(pixels.slice(0, 20)));

        canvas.width = width;
        canvas.height = height;

        const imageData = ctx.createImageData(width, height);
        const pixelCount = Math.min(pixels.length, width * height);

        for (let i = 0; i < pixelCount; i++) {
          const val = pixels[i];
          const idx = i * 4;

          imageData.data[idx] = val;
          imageData.data[idx + 1] = val;
          imageData.data[idx + 2] = val;
          imageData.data[idx + 3] = 255;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(imageData, 0, 0);

        console.log(`Rendu terminé : ${width}x${height}`);
      })
      .catch((err) => console.error('Erreur de rendu PGM:', err));
  }, [mapName]);

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