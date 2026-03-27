import { useState, useEffect, useRef, useContext } from 'react';
import Card from '../components/common/Card';
import MapCanvas from '../components/MapCanvas';
import DashboardLayout from '../components/layout/DashboardLayout';
import { RobotContext } from '../context/RobotContext';
import { useI18n } from '../i18n/LanguageContext';
import { getRosbridgeUrl } from '../utils/rosbridge';
import './telecommande.css';

const DEFAULT_CAMERA_TOPIC = '/oakd/rgb/preview/image_raw';
const DEFAULT_CAMERA_HOST = '172.20.10.3';
const DEFAULT_CAMERA_PORT = '8090';
const DEFAULT_CAMERA_QOS_PROFILE = 'sensor_data';
const VIDEO_STARTUP_DELAY_MS = 1200;

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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isVideoBusy, setIsVideoBusy] = useState(false);
  const [videoViewerNonce, setVideoViewerNonce] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [isMapsLoading, setIsMapsLoading] = useState(false);

  const moveInterval = useRef(null);
  const rosRef = useRef(null);

  const cameraTopic = DEFAULT_CAMERA_TOPIC;
  const videoStreamUrl = selectedRobotId && isVideoEnabled
    ? `http://${DEFAULT_CAMERA_HOST}:${DEFAULT_CAMERA_PORT}/stream?topic=${cameraTopic}&type=mjpeg&quality=65&qos_profile=${DEFAULT_CAMERA_QOS_PROFILE}&t=${videoViewerNonce}`
    : '';
  const selectedMap = maps.find((map) => map.id === selectedMapId) || null;

  useEffect(() => {
    setIsVideoEnabled(false);
    setVideoViewerNonce(0);
    setVideoError('');
  }, [selectedRobotId]);

  const setupOdomListener = (ros) => {
    const odomListener = new window.ROSLIB.Topic({
      ros: ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry'
    });

    odomListener.subscribe((pose) => {
      setPosX(pose.pose.pose.position.x.toFixed(2));
      setPosY(pose.pose.pose.position.y.toFixed(2));
    });

    return odomListener;
  };

  useEffect(() => {
    let odomListener = null;

    getRosbridgeUrl()
      .then((rosUrl) => {
        const ros = new window.ROSLIB.Ros({ url: rosUrl });
        rosRef.current = ros;

        ros.on('connection', () => {
          setStatus('CONNECTED');
          odomListener = setupOdomListener(ros);
        });

        ros.on('error', () => {
          setStatus('ERROR');
        });
        ros.on('close', () => {
          setStatus('DISCONNECTED');
        });

      })
      .catch((err) => console.error('Erreur config:', err));

    return () => {
      if (odomListener) odomListener.unsubscribe();
      if (rosRef.current) rosRef.current.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMaps = async () => {
      setIsMapsLoading(true);

      try {
        const response = await fetch('/api/maps');
        const data = await response.json();

        if (!cancelled) {
          const nextMaps = Array.isArray(data.maps) ? data.maps : [];
          setMaps(nextMaps);
          setSelectedMapId((currentSelectedMapId) => {
            if (currentSelectedMapId && nextMaps.some((map) => map.id === currentSelectedMapId)) {
              return currentSelectedMapId;
            }

            return nextMaps[0]?.id || '';
          });
        }
      } catch (error) {
        console.error('Erreur chargement maps teleop:', error);
        if (!cancelled) {
          setMaps([]);
          setSelectedMapId('');
        }
      } finally {
        if (!cancelled) {
          setIsMapsLoading(false);
        }
      }
    };

    loadMaps();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    const fetchBattery = async () => {
      if (!selectedRobotId) {
        setBattery('--');
        return;
      }

      try {
        const response = await fetch(`/api/telemetry?robotId=${encodeURIComponent(selectedRobotId)}`);
        const data = await response.json();

        if (cancelled) {
          return;
        }

        const batteryPercent = data?.telemetry?.batteryPercent;

        if (typeof batteryPercent === 'number' && Number.isFinite(batteryPercent)) {
          setBattery(batteryPercent);
          return;
        }

        setBattery('--');
      } catch (error) {
        console.error('Erreur lecture batterie MQTT:', error);
        if (!cancelled) {
          setBattery('--');
        }
      }
    };

    fetchBattery();

    if (selectedRobotId) {
      intervalId = setInterval(fetchBattery, 2000);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedRobotId]);

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

  const startVideoStream = async () => {
    if (!selectedRobotId) {
      alert(t('common.selectRobot'));
      return;
    }

    setIsVideoBusy(true);
    setVideoError('');
    setIsVideoEnabled(false);

    try {
      const response = await fetch('/api/start_video_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotId: selectedRobotId })
      });

      if (!response.ok) {
        throw new Error('Erreur lancement flux video');
      }

      setVideoViewerNonce(Date.now());
      window.setTimeout(() => {
        setIsVideoEnabled(true);
      }, VIDEO_STARTUP_DELAY_MS);
    } catch (error) {
      console.error('Erreur lancement video:', error);
      setVideoError('Impossible de lancer le flux video sur le robot.');
    } finally {
      setIsVideoBusy(false);
    }
  };

  const stopVideoStream = async () => {
    if (!selectedRobotId) {
      alert(t('common.selectRobot'));
      return;
    }

    setIsVideoBusy(true);
    setIsVideoEnabled(false);
    setVideoViewerNonce(0);
    setVideoError('');

    try {
      const response = await fetch('/api/stop_video_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotId: selectedRobotId })
      });

      if (!response.ok) {
        throw new Error('Erreur arret flux video');
      }
    } catch (error) {
      console.error('Erreur arret video:', error);
      setVideoError('Impossible d arreter le flux video sur le robot.');
    } finally {
      setIsVideoBusy(false);
    }
  };

  const videoPlaceholderMessage = !selectedRobotId
    ? t('common.selectRobot')
    : videoError || 'Flux video desactive. Clique sur Activer flux pour demarrer le stream du robot.';
  const mapPlaceholderMessage = isMapsLoading
    ? 'Chargement des cartes...'
    : 'Aucune carte disponible.';

  return (
    <DashboardLayout contentClassName="layout-content--split">
      <div className="teleop-page">
        
        <div className="teleop-col-left">
          <Card title="Live Camera Feed">
            <div className="video-toolbar">
              <div className="video-actions">
                <button
                  type="button"
                  className="video-btn video-btn-primary"
                  onClick={startVideoStream}
                  disabled={!selectedRobotId || !isRobotOnline || isVideoBusy}
                >
                  {isVideoBusy ? 'Activation...' : 'Activer flux'}
                </button>
                <button
                  type="button"
                  className="video-btn video-btn-danger"
                  onClick={stopVideoStream}
                  disabled={!selectedRobotId || isVideoBusy}
                >
                  {isVideoBusy ? 'Arret...' : 'Desactiver flux'}
                </button>
              </div>
            </div>

            <div className="video-container">
              {isVideoEnabled ? (
                <img
                  key={videoStreamUrl}
                  src={videoStreamUrl}
                  alt="Flux video robot"
                  className="video-stream"
                  onLoad={() => setVideoError('')}
                  onError={() => setVideoError('Le flux video est actif mais le navigateur n a rien recu.')}
                />
              ) : (
                <div className="video-placeholder">
                  {videoPlaceholderMessage}
                </div>
              )}
            </div>
          </Card>

          <Card title="Map Preview">
            <div className="map-toolbar">
              <label className="map-select-label" htmlFor="teleop-map-select">
                Carte
              </label>
              <select
                id="teleop-map-select"
                className="map-select"
                value={selectedMapId}
                onChange={(event) => setSelectedMapId(event.target.value)}
                disabled={isMapsLoading || maps.length === 0}
              >
                {maps.length === 0 ? (
                  <option value="">Aucune carte</option>
                ) : (
                  maps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="map-preview-shell">
              {selectedMap ? (
                <MapCanvas
                  mapName={selectedMap.name}
                  initialPose={selectedMap.initialPose}
                />
              ) : (
                <div className="video-placeholder">
                  {mapPlaceholderMessage}
                </div>
              )}
            </div>

            {selectedMap?.initialPose ? (
              <div className="map-caption">
                Pose initiale: x={selectedMap.initialPose.x.toFixed(2)} y={selectedMap.initialPose.y.toFixed(2)}
              </div>
            ) : null}
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
