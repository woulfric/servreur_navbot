import { useState, useEffect, useRef } from 'react';
import Card from '../components/common/Card';
import DashboardLayout from '../components/layout/DashboardLayout';
import './telecommande.css'; // On réutilise volontairement la grille de la télécommande !

export default function MapView() {
  const [status, setStatus] = useState('CONNECTING...');
  const [mapInfo, setMapInfo] = useState('WAITING DATA...');
  const [posX, setPosX] = useState('0.00');
  const [posY, setPosY] = useState('0.00');

  const moveInterval = useRef(null);
  const mapContainerRef = useRef(null);
  const rosRef = useRef(null);
  const viewerRef = useRef(null);
  const gridClientRef = useRef(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        const rosUrl = config.ROSBRIDGE_URL || `ws://${window.location.hostname}:9090`;
        const ros = new window.ROSLIB.Ros({ url: rosUrl });
        rosRef.current = ros;

        ros.on('connection', () => {
          setStatus('CONNECTED');
          setupMapViewer(ros);
        });
        ros.on('error', () => setStatus('ERROR'));
        ros.on('close', () => setStatus('DISCONNECTED'));
      })
      .catch(err => console.error("Erreur config:", err));

    return () => {
      if (rosRef.current) rosRef.current.close();
    };
  }, []);

  const setupMapViewer = (ros) => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';

    viewerRef.current = new window.ROS2D.Viewer({
      divID: mapContainerRef.current.id,
      width: mapContainerRef.current.offsetWidth || 800,
      height: 600, // Une zone de carte bien haute
      background: '#1a1a1a'
    });

    gridClientRef.current = new window.ROS2D.OccupancyGridClient({
      ros: ros,
      rootObject: viewerRef.current.scene,
      continuous: true // CRUCIAL POUR LE SLAM : Met à jour la carte en direct
    });

    gridClientRef.current.on('change', () => {
      setMapInfo('GRID RECEIVED');
      viewerRef.current.scaleToDimensions(gridClientRef.current.currentGrid.width, gridClientRef.current.currentGrid.height);
      viewerRef.current.shift(gridClientRef.current.currentGrid.pose.position.x, gridClientRef.current.currentGrid.pose.position.y);
    });

    const robotMarker = new window.ROS2D.NavigationArrow({
      size: 25, strokeSize: 1, fillColor: window.createjs.Graphics.getRGB(231, 76, 60, 0.9), pulse: false
    });
    robotMarker.visible = false;
    viewerRef.current.scene.addChild(robotMarker);

    const odomListener = new window.ROSLIB.Topic({
      ros: ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry'
    });

    odomListener.subscribe((pose) => {
      robotMarker.x = pose.pose.pose.position.x;
      robotMarker.y = pose.pose.pose.position.y;
      const q = pose.pose.pose.orientation;
      const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
      const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
      const yaw = Math.atan2(siny_cosp, cosy_cosp);
      robotMarker.rotation = -yaw * (180.0 / Math.PI);
      robotMarker.visible = true;

      setPosX(pose.pose.pose.position.x.toFixed(2));
      setPosY(pose.pose.pose.position.y.toFixed(2));
    });
  };

  // --- ACTIONS SLAM (Appels à tes scripts bash) ---
  const toggleSlam = (action) => {
    setMapInfo(action === 'start' ? 'STARTING SLAM...' : 'STOPPING SLAM...');
    const endpoint = action === 'start' ? '/api/start_slam' : '/api/stop_slam';
    
    fetch(endpoint, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMapInfo(action === 'start' ? 'SLAM RUNNING' : 'SLAM STOPPED');
          if (action === 'start') {
            setTimeout(() => window.location.reload(), 2000); // Recharge la page pour accrocher le nouveau topic map
          }
        }
      })
      .catch(err => {
        console.error(err);
        setMapInfo('ERROR SLAM');
      });
  };

  const saveMap = () => {
    setMapInfo('SAVING MAP...');
    fetch('/api/save_map', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMapInfo('MAP SAVED !');
          alert("Carte sauvegardée avec succès sur le serveur !");
        } else {
          setMapInfo('SAVE FAILED');
        }
      })
      .catch(err => setMapInfo('ERROR SAVING'));
  };

  const resetMap = () => {
    setMapInfo('RESETTING SLAM...');
    fetch('/api/reset_slam', { method: 'POST' })
      .then(() => {
        setTimeout(() => window.location.reload(), 5000); // Laisse 5 secondes au script bash pour relancer
      })
      .catch(err => setMapInfo('ERROR RESET'));
  };

  // --- CONTROLE MANUEL POUR LE SCAN ---
  // On fixe les vitesses pour le mapping à 0.2 m/s et 0.8 rad/s comme dans ton ancienne version
  const sendCommand = (lin, ang) => {
    fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linear: lin * 0.2, angular: ang * 0.8 }) 
    }).catch(e => console.error(e));
  };

  const startMove = (linMult, angMult) => {
    if (moveInterval.current) return;
    sendCommand(linMult, angMult);
    moveInterval.current = setInterval(() => sendCommand(linMult, angMult), 200);
  };

  const stopMove = () => {
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
      moveInterval.current = null;
    }
    fetch('/api/stop', { method: 'POST' });
  };

  return (
    <DashboardLayout>
      <div className="teleop-page">
        
        {/* PANNEAU GAUCHE : La Carte */}
        <div className="teleop-col-left">
          <Card title={`SLAM Visualizer - Status : ${mapInfo}`}>
            <div 
              id="ros-map-container" 
              ref={mapContainerRef} 
              className="map-container" 
              style={{ height: '600px' }}
            ></div>
          </Card>
        </div>

        {/* PANNEAU DROIT : Contrôles du SLAM et Robot */}
        <div className="teleop-col-right">
          
          <Card title="SLAM Controls">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                style={{ flex: 1, padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => toggleSlam('start')}
              >
                START SLAM
              </button>
              <button 
                style={{ flex: 1, padding: '15px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => toggleSlam('stop')}
              >
                STOP SLAM
              </button>
            </div>
            
            <button 
              style={{ width: '100%', padding: '15px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }} 
              onClick={saveMap}
            >
              SAVE CURRENT MAP
            </button>
            <button 
              style={{ width: '100%', padding: '15px', background: '#d35400', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} 
              onClick={resetMap}
            >
              RESET SLAM
            </button>
          </Card>

          <Card title="Robot Override">
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '15px' }}>
              Utilisez les flèches pour déplacer le robot et scanner la zone.
            </p>
            <div className="teleop-pad" style={{ margin: 0 }}>
              <button className="teleop-btn up" onMouseDown={() => startMove(1, 0)} onMouseUp={stopMove} onMouseLeave={stopMove}>▲</button>
              <div className="teleop-middle-row">
                <button className="teleop-btn left" onMouseDown={() => startMove(0, 1)} onMouseUp={stopMove} onMouseLeave={stopMove}>◀</button>
                <button className="teleop-btn stop" onClick={stopMove}>■</button>
                <button className="teleop-btn right" onMouseDown={() => startMove(0, -1)} onMouseUp={stopMove} onMouseLeave={stopMove}>▶</button>
              </div>
              <button className="teleop-btn down" onMouseDown={() => startMove(-1, 0)} onMouseUp={stopMove} onMouseLeave={stopMove}>▼</button>
            </div>
          </Card>

          <Card title="System Connection">
            <ul className="teleop-list">
              <li>
                <span>Connection</span>
                <strong className={`status-val ${status === 'CONNECTED' ? 'connected' : 'disconnected'}`}>
                  {status}
                </strong>
              </li>
            </ul>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}