import { useEffect, useRef } from 'react';

export default function MapCanvas({ mapName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!mapName) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mapUrl = `/map/${mapName}.pgm`;

    fetch(mapUrl)
      .then(res => {
        if (!res.ok) throw new Error("Fichier introuvable sur le serveur");
        return res.arrayBuffer();
      })
      .then(buffer => {
        const view = new Uint8Array(buffer);
        let offset = 0;

        const readToken = () => {
          let token = "";
          // Sauter les espaces et commentaires
          while (offset < view.length) {
            const char = String.fromCharCode(view[offset]);
            if (view[offset] === 35) { // #
              while (offset < view.length && view[offset] !== 10) offset++;
            } else if (view[offset] <= 32) {
              offset++;
            } else {
              break;
            }
          }
          // Lire le mot
          while (offset < view.length && view[offset] > 32) {
            token += String.fromCharCode(view[offset]);
            offset++;
          }
          return token;
        };

        const magic = readToken(); // P5
        const width = parseInt(readToken(), 10);
        const height = parseInt(readToken(), 10);
        const maxVal = parseInt(readToken(), 10);
        offset++; // Sauter le dernier espace avant les datas

        if (isNaN(width) || isNaN(height)) return;

        // Ajuster la taille du canvas
        canvas.width = width;
        canvas.height = height;

        const imageData = ctx.createImageData(width, height);
        const pixels = view.slice(offset);

        for (let i = 0; i < pixels.length; i++) {
          const val = pixels[i];
          const idx = i * 4;
          // ROS PGM : 0=Obstacle (Noir), 254/255=Libre (Blanc), 205=Inconnu (Gris)
          imageData.data[idx] = val;     
          imageData.data[idx + 1] = val; 
          imageData.data[idx + 2] = val; 
          imageData.data[idx + 3] = 255; 
        }

        // Nettoyer et dessiner
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`Rendu terminé : ${width}x${height} pixels.`);
      })
      .catch(err => console.error("Erreur de rendu PGM:", err));
  }, [mapName]);

  return (
    <div style={{ 
      width: '100%', 
      height: '500px', 
      background: '#0b0f18', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      overflow: 'hidden',
      border: '1px solid #2a3f5f',
      borderRadius: '8px'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          imageRendering: 'pixelated', // Garde les murs nets
          width: 'auto',
          height: '100%', // Force la carte à prendre toute la hauteur du Card
          maxHeight: '100%',
          maxWidth: '100%'
        }} 
      />
    </div>
  );
}