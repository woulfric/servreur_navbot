import { useState, useEffect, useRef, useContext } from 'react';
import Card from '../components/common/Card';
import DashboardLayout from '../components/layout/DashboardLayout';
import { RobotContext } from '../context/RobotContext';
import './mapView.css'; 

export default function MapView() {
  const { selectedRobotId, isRobotOnline } = useContext(RobotContext);
  
  const [status, setStatus] = useState('CONNECTING...');
  const [mapInfo, setMapInfo] = useState('WAITING DATA...');
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
      background: '#333333'
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

  const startOrResetSlam = () => {
    if (!selectedRobotId) return alert("Sélectionnez un robot d'abord.");

    setMapInfo('INITIALIZING SLAM NODE...');
    fetch('/api/reset_slam', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId })
    })
      .then(() => {
        setTimeout(() => window.location.reload(), 5000); 
      })
      .catch(err => setMapInfo('ERROR SLAM RPC'));
  };

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

    const mapName = window.prompt("Entrez un nom pour la map serveur (ex: zone_a) :");
    if (!mapName || mapName.trim() === "") return;

    setMapInfo('SERIALIZING MAP...');
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
          alert(`Payload envoyé. La matrice de coût "${mapName}" est sauvegardée sur le disque du robot.`);
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
    <DashboardLayout contentClassName="layout-content--split">
      <div className="teleop-page mapview-page">
        
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
          
          <Card title="Bridge Controls">
            {!selectedRobotId && (
              <div style={{ padding: '6px', background: '#FF9800', color: '#FCFDFF', marginBottom: '6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                Veuillez sélectionner un robot
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{ flex: 1, padding: '8px', background: '#546FA8', color: '#FCFDFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={() => toggleBridge('start')}
                disabled={!isRobotOnline}
              >
                START BRIDGE
              </button>
              <button 
                style={{ flex: 1, padding: '8px', background: '#24386E', color: '#FCFDFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', opacity: isRobotOnline ? 1 : 0.5 }} 
                onClick={() => toggleBridge('stop')}
                disabled={!isRobotOnline}
              >
                STOP BRIDGE
              </button>
            </div>
          </Card>

          <Card title="SLAM Controls">
            <button 
              style={{ width: '100%', padding: '8px', background: '#FF9800', color: '#FCFDFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px', opacity: isRobotOnline ? 1 : 0.5 }} 
              onClick={startOrResetSlam}
              disabled={!isRobotOnline}
            >
              START / RESET SLAM
            </button>
            <button 
              style={{ width: '100%', padding: '8px', background: '#546FA8', color: '#FCFDFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', opacity: isRobotOnline ? 1 : 0.5 }} 
              onClick={saveMap}
              disabled={!isRobotOnline}
            >
              SAVE CURRENT MAP
            </button>
          </Card>

          <Card title="Telemetry">
            <div className="telemetry-grid">
              <div>
                <div style={{ fontSize: '12px', color: '#888888', textAlign: 'center' }}>Position X</div>
                <div className="telemetry-val">{posX}m</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#888888', textAlign: 'center' }}>Position Y</div>
                <div className="telemetry-val">{posY}m</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#888888', textAlign: 'center' }}>Batterie</div>
                <div className="telemetry-val battery-val">{battery} V</div>
              </div>
            </div>
          </Card>

          <Card title="Robot Override">
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
                <span>Robot Target</span>
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