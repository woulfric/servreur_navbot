import { useState, useEffect, useRef, useContext } from 'react';
import Card from '../components/common/Card';
import DashboardLayout from '../components/layout/DashboardLayout';
import { RobotContext } from '../context/RobotContext';
import { useI18n } from '../i18n/LanguageContext';
import { getRosbridgeUrl } from '../utils/rosbridge';
import './telecommande.css';

export default function Telecommande() {
  const { selectedRobotId, isRobotOnline } = useContext(RobotContext);
  const { t } = useI18n();

  const [battery, setBattery] = useState('--');
  const [posX, setPosX] = useState('0.00');
  const [posY, setPosY] = useState('0.00');
  const [status, setStatus] = useState('CONNECTING...');
  const [linearSpeed, setLinearSpeed] = useState(0.2);
  const [angularSpeed, setAngularSpeed] = useState(0.8);
  const [isEmergency, setIsEmergency] = useState(false);

  const moveInterval = useRef(null);
  const mapContainerRef = useRef(null);
  const rosRef = useRef(null);
  const viewerRef = useRef(null);

  const robotIpCam = window.location.hostname;
  const cameraTopic = '/oakd/rgb/preview/image_raw';
  const videoUrl = `http://${robotIpCam}:8080/stream?topic=${cameraTopic}&type=mjpeg&quality=30`;

  const setupMapViewer = (ros) => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';

    viewerRef.current = new window.ROS2D.Viewer({
      divID: mapContainerRef.current.id,
      width: mapContainerRef.current.offsetWidth || 800,
      height: 450,
      background: '#1a1a1a'
    });

    const gridClient = new window.ROS2D.OccupancyGridClient({
      ros: ros,
      rootObject: viewerRef.current.scene,
      continuous: false
    });

    gridClient.on('change', () => {
      viewerRef.current.scaleToDimensions(gridClient.currentGrid.width, gridClient.currentGrid.height);
      viewerRef.current.shift(gridClient.currentGrid.pose.position.x, gridClient.currentGrid.pose.position.y);
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

    return odomListener;
  };

  useEffect(() => {
    let batteryListener = null;
    let odomListener = null;

    getRosbridgeUrl()
      .then((rosUrl) => {
        const ros = new window.ROSLIB.Ros({ url: rosUrl });
        rosRef.current = ros;

        ros.on('connection', () => {
          setStatus('CONNECTED');
          odomListener = setupMapViewer(ros);
        });

        ros.on('error', () => {
          setStatus('ERROR');
        });
        ros.on('close', () => {
          setStatus('DISCONNECTED');
        });

        batteryListener = new window.ROSLIB.Topic({
          ros: ros,
          name: '/battery_state',
          messageType: 'sensor_msgs/BatteryState'
        });
        batteryListener.subscribe((bat) => {
          let percent = Math.round((bat.percentage || 0) * 100);
          if (percent > 100) percent = 100;
          if (percent < 0 || Number.isNaN(percent)) percent = 0;
          setBattery(percent);
        });
      })
      .catch((err) => console.error('Erreur config:', err));

    return () => {
      if (odomListener) odomListener.unsubscribe();
      if (batteryListener) batteryListener.unsubscribe();
      if (rosRef.current) rosRef.current.close();
    };
  }, []);

  const sendCommand = (lin, ang) => {
    if (isEmergency || !selectedRobotId) return;
    fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId, linear: lin, angular: ang })
    }).catch(e => console.error(e));
  };

  const startMove = (linMult, angMult) => {
    if (isEmergency || moveInterval.current || !isRobotOnline) return;
    const lin = linearSpeed * linMult;
    const ang = angularSpeed * angMult;
    sendCommand(lin, ang);
    moveInterval.current = setInterval(() => sendCommand(lin, ang), 150);
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

  const toggleEmergency = () => {
    if (!selectedRobotId) return alert(t('common.selectRobot'));

    const newState = !isEmergency;
    setIsEmergency(newState);
    fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId, state: newState ? 'on' : 'off' })
    });
    if (newState) stopMove();
  };

  return (
    <DashboardLayout contentClassName="layout-content--split">
      <div className="teleop-page">
        
        <div className="teleop-col-left">
          <Card title="Live Camera Feed">
            <div className="video-container">
              <img 
                src={videoUrl} 
                alt="Flux vidéo indisponible" 
                onError={(e) => { e.target.style.display = 'none'; setTimeout(() => { e.target.src = videoUrl; e.target.style.display = 'block'; }, 2000); }}
              />
            </div>
          </Card>

          <Card title="Live Map">
            <div id="ros-map-container" ref={mapContainerRef} className="map-container"></div>
          </Card>
        </div>

        <div className="teleop-col-right">
          
          <div className="telemetry-grid">
            <Card title="Position (X/Y)">
              <div className="telemetry-val">
                {posX} <span className="telemetry-sep">|</span> {posY}
              </div>
            </Card>
            <Card title="Battery">
              <div className="telemetry-val battery-val">
                {battery}%
              </div>
            </Card>
          </div>

          <Card title="Manual Control">
            {!selectedRobotId && (
              <div style={{ padding: '10px', background: '#FF9800', color: '#FCFDFF', marginBottom: '15px', borderRadius: '5px', textAlign: 'center' }}>
                {t('common.selectRobot')}
              </div>
            )}
            <div className={isEmergency || !isRobotOnline ? 'blocked' : ''}>
              
              <div className="teleop-pad">
                <button className="teleop-btn up" onMouseDown={() => startMove(1, 0)} onMouseUp={stopMove} onMouseLeave={stopMove}>▲</button>
                <div className="teleop-middle-row">
                  <button className="teleop-btn left" onMouseDown={() => startMove(0, 1)} onMouseUp={stopMove} onMouseLeave={stopMove}>◀</button>
                  <button className="teleop-btn stop" onClick={stopMove}>■</button>
                  <button className="teleop-btn right" onMouseDown={() => startMove(0, -1)} onMouseUp={stopMove} onMouseLeave={stopMove}>▶</button>
                </div>
                <button className="teleop-btn down" onMouseDown={() => startMove(-1, 0)} onMouseUp={stopMove} onMouseLeave={stopMove}>▼</button>
              </div>

              <div className="teleop-speed">
                <div className="slider-group">
                  <div className="slider-labels">
                    <span>Vitesse Linéaire</span>
                    <span>{linearSpeed.toFixed(2)} m/s</span>
                  </div>
                  <input type="range" className="slider-input" min="0.05" max="0.45" step="0.05" value={linearSpeed} onChange={(e) => setLinearSpeed(parseFloat(e.target.value))} />
                </div>
                
                <div className="slider-group">
                  <div className="slider-labels">
                    <span>Vitesse Angulaire</span>
                    <span>{angularSpeed.toFixed(2)} rad/s</span>
                  </div>
                  <input type="range" className="slider-input" min="0.1" max="1.9" step="0.1" value={angularSpeed} onChange={(e) => setAngularSpeed(parseFloat(e.target.value))} />
                </div>
              </div>

            </div>
          </Card>

          <Card title="System Status">
            <ul className="teleop-list">
              <li>
                <span>Robot Cible</span>
                <strong>{selectedRobotId || t('common.none')}</strong>
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
            <button 
              className={`btn-emergency ${isEmergency ? 'active' : ''}`} 
              onClick={toggleEmergency}
              disabled={!isRobotOnline}
              style={{ opacity: isRobotOnline ? 1 : 0.5 }}
            >
              {isEmergency ? "UNLOCK SYSTEM" : "EMERGENCY STOP"}
            </button>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
