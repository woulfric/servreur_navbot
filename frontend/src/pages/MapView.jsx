import { useState, useEffect, useRef, useContext } from 'react';
import Card from '../components/common/Card';
import DashboardLayout from '../components/layout/DashboardLayout';
import { RobotContext } from '../context/RobotContext';
import './telecommande.css'; 

export default function MapView() {
  const { selectedRobotId, isRobotOnline } = useContext(RobotContext);
  
  const [status, setStatus] = useState('CONNECTING...');
  const [mapInfo, setMapInfo] = useState('WAITING DATA...');
  // Nouveaux states pour la télémétrie
  const [posX, setPosX] = useState('0.00');
  const [posY, setPosY] = useState('0.00');
  const [battery, setBattery] = useState('--.-');

  const moveInterval = useRef(null);
  const mapContainerRef = useRef(null);
  const rosRef = useRef(null);
  const viewerRef = useRef(null);
  const gridClientRef = useRef(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        const rosUrl = 'wss://ros.navbot.dev';
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
      height: 600, 
      background: '#1a1a1a'
    });

    gridClientRef.current = new window.ROS2D.OccupancyGridClient({
      ros: ros,
      rootObject: viewerRef.current.scene,
      continuous: true 
    });

    gridClientRef.current.on('change', () => {
      setMapInfo('GRID RECEIVED');
      viewerRef.current.scaleToDimensions(gridClientRef.current.currentGrid.width, gridClientRef.current.currentGrid.height);
      viewerRef.current.shift(gridClientRef.current.currentGrid.pose.position.x, gridClientRef.current.currentGrid.pose.position.y);
    });

    const robotMarker = new window.ROS2D.NavigationArrow({
      size: 0.8, 
      strokeSize: 0.02, 
      strokeColor: window.createjs.Graphics.getRGB(231, 76, 60, 1), 
      fillColor: window.createjs.Graphics.getRGB(231, 76, 60, 0.9), 
      pulse: false
    });
    robotMarker.visible = false;
    viewerRef.current.scene.addChild(robotMarker);

    // Topic Odométrie
    const odomListener = new window.ROSLIB.Topic({
      ros: ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry'
    });

    odomListener.subscribe((pose) => {
      robotMarker.x = pose.pose.pose.position.x;
      robotMarker.y = -pose.pose.pose.position.y; 
      
      const q = pose.pose.pose.orientation;
      const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
      const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
      const yaw = Math.atan2(siny_cosp, cosy_cosp);
      robotMarker.rotation = -yaw * (180.0 / Math.PI);
      robotMarker.visible = true;

      setPosX(pose.pose.pose.position.x.toFixed(2));
      setPosY(pose.pose.pose.position.y.toFixed(2));
    });

    // Topic Batterie
    const batteryListener = new window.ROSLIB.Topic({
      ros: ros,
      name: '/battery_state',
      messageType: 'sensor_msgs/BatteryState'
    });

    batteryListener.subscribe((msg) => {
      if (msg.voltage) {
        setBattery(msg.voltage.toFixed(1));
      }
    });
  };

  const toggleSlam = (action) => {
    if (!selectedRobotId) return alert("Sélectionnez un robot d'abord.");
    
    setMapInfo(action === 'start' ? 'STARTING SLAM...' : 'STOPPING SLAM...');
    const endpoint = action === 'start' ? '/api/start_slam' : '/api/stop_slam';
    
    fetch(endpoint, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMapInfo(action === 'start' ? 'SLAM RUNNING' : 'SLAM STOPPED');
          if (action === 'start') {
            setTimeout(() => window.location.reload(), 2000); 
          }
        }
      })
      .catch(err => {
        console.error(err);
        setMapInfo('ERROR SLAM');
      });
  };

  const resetMap = () => {
    if (!selectedRobotId) return;

    setMapInfo('RESETTING SLAM...');
    fetch('/api/reset_slam', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId })
    })
      .then(() => {
        setTimeout(() => window.location.reload(), 5000); 
      })
      .catch(err => setMapInfo('ERROR RESET'));
  };

  // Nouvelle fonction pour contrôler le Bridge
  const toggleBridge = (action) => {
    if (!selectedRobotId) return alert("Sélectionnez un robot d'abord.");
    
    setMapInfo(action === 'start' ? 'STARTING ROSBRIDGE...' : 'STOPPING ROSBRIDGE...');
    fetch(`/api/${action}_bridge`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId })
    })
      .then(res => res.json())
      .then(data => {
        if (action === 'start') {
          setTimeout(() => window.location.reload(), 3000);
        } else {
          setStatus('DISCONNECTED');
        }
      })
      .catch(err => setMapInfo('ERROR BRIDGE RPC'));
  };

  const saveMap = () => {
    if (!selectedRobotId) return alert("Sélectionnez un robot d'abord.");

    const mapName = window.prompt("Entrez un nom pour cette carte (ex: zone_a) :");
    if (!mapName || mapName.trim() === "") return;

    setMapInfo('SAVING MAP...');
    fetch('/api/save_map', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        robotId: selectedRobotId, 
        mapName: mapName.trim()
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMapInfo('MAP SAVED !');
          alert(`Ordre envoyé ! La carte "${mapName}" est en cours de sauvegarde sur le robot.`);
        } else {
          setMapInfo('SAVE FAILED');
        }
      })
      .catch(err => setMapInfo('ERROR SAVING'));
  };

  const sendCommand = (lin, ang) => {
    if (!selectedRobotId) return;
    
    fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId, linear: lin * 0.2, angular: ang * 0.8 }) 
    }).catch(e => console.error(e));
  };

  const startMove = (linMult, angMult) => {
    if (moveInterval.current || !isRobotOnline) return;
    sendCommand(linMult, angMult);
    moveInterval.current = setInterval(() => sendCommand(linMult, angMult), 200);
  };

  const stopMove = () => {
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
      moveInterval.current = null;
    }
    if (!selectedRobotId) return;
    
    fetch('/api/stop', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId })
    });
  };

  return (
    <DashboardLayout>
      <div className="teleop-page">
        
        <div className="teleop-col-left">
          <Card title={`SLAM Visualizer - Status : ${mapInfo}`}>
            <div 
              id="ros-map-container" 
              ref={mapContainerRef} 
              className="map-container" 
            ></div>
          </Card>
        </div>

        <div className="teleop-col-right">
          
          {/* Nouveaux contrôles du Bridge */}
          <Card title="Bridge Controls">
            {!selectedRobotId && (
              <div style={{ padding: '10px', background: '#f39c12', color: 'white', marginBottom: '15px', borderRadius: '5px', textAlign: 'center' }}>
                Veuillez sélectionner un robot
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ flex: 1, padding: '15px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={() => toggleBridge('start')}
                disabled={!isRobotOnline}
              >
                START BRIDGE
              </button>
              <button 
                style={{ flex: 1, padding: '15px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={() => toggleBridge('stop')}
                disabled={!isRobotOnline}
              >
                STOP BRIDGE
              </button>
            </div>
          </Card>

          {/* SLAM Controls fusionnés */}
          <Card title="SLAM Controls">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                style={{ flex: 1, padding: '15px', background: '#d35400', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={resetMap}
                disabled={!isRobotOnline}
              >
                START / RESET SLAM
              </button>
              <button 
                style={{ flex: 1, padding: '15px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={() => toggleSlam('stop')}
                disabled={!isRobotOnline}
              >
                STOP SLAM
              </button>
            </div>
            
            <button 
              style={{ width: '100%', padding: '15px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isRobotOnline ? 1 : 0.5 }} 
              onClick={saveMap}
              disabled={!isRobotOnline}
            >
              SAVE CURRENT MAP
            </button>
          </Card>

          {/* Nouvelle carte Télémétrie */}
          <Card title="Telemetry">
            <div className="telemetry-grid">
              <div>
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '5px' }}>Position X</div>
                <div className="telemetry-val">{posX}m</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '5px' }}>Position Y</div>
                <div className="telemetry-val">{posY}m</div>
              </div>
              <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '5px' }}>Batterie</div>
                <div className="telemetry-val battery-val">{battery} V</div>
              </div>
            </div>
          </Card>

          <Card title="Robot Override">
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '15px' }}>
              Utilisez les flèches pour déplacer le robot et scanner la zone.
            </p>
            <div className={`teleop-pad ${!isRobotOnline ? 'blocked' : ''}`} style={{ margin: 0 }}>
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
                <span>Robot Cible</span>
                <strong>{selectedRobotId || "Aucun"}</strong>
              </li>
              <li>
                <span>Broker MQTT</span>
                <strong className={`status-val ${isRobotOnline ? 'connected' : 'disconnected'}`}>
                  {isRobotOnline ? 'ONLINE' : 'OFFLINE'}
                </strong>
              </li>
              <li>
                <span>Data Bridge (ROS)</span>
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