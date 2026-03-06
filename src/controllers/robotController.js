const mqttService = require('../services/mqttService');

const CURRENT_ROBOT_ID = 'tb3_01';

const getTelemetry = (req, res) => {
  res.json({ status: 'ok' });
};

const moveRobot = (req, res) => {
  const { linear, angular } = req.body;
  
  mqttService.publishVelocityCommand(CURRENT_ROBOT_ID, linear, angular);
  
  res.json({ status: 'success', message: 'Commande de mouvement publiée' });
};

const stopRobot = (req, res) => {
  mqttService.publishVelocityCommand(CURRENT_ROBOT_ID, 0.0, 0.0);
  
  res.json({ status: 'success', message: 'Commande d\'arrêt publiée' });
};

const toggleEmergency = (req, res) => {
  const { state } = req.body;
  
  if (state === 'on') {
    mqttService.publishVelocityCommand(CURRENT_ROBOT_ID, 0.0, 0.0);
    mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'emergency_stop');
  } else {
    mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'emergency_release');
  }
  
  res.json({ status: 'success', state });
};

const getConfig = (req, res) => {
  res.json({ 
    ROSBRIDGE_URL: `ws://${req.hostname}:9090` 
  });
};

const resetSlam = (req, res) => {
  mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'reset_slam');
  res.json({ status: 'success', message: 'Ordre de réinitialisation publié' });
};

const saveMap = (req, res) => {
  mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'save_map');
  res.json({ status: 'success', message: 'Ordre de sauvegarde publié' });
};

const getMaps = (req, res) => {
  res.json({ maps: [] });
};

const loadMap = (req, res) => {
  const { mapName } = req.body;
  mqttService.publishSystemCommand(CURRENT_ROBOT_ID, `load_map:${mapName}`);
  res.json({ status: 'success', message: 'Ordre de chargement de la carte publié' });
};

const startSlam = (req, res) => {
  mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'start_slam');
  res.json({ status: 'success', message: 'Ordre de démarrage du SLAM publié' });
};

const stopSlam = (req, res) => {
  mqttService.publishSystemCommand(CURRENT_ROBOT_ID, 'stop_slam');
  res.json({ status: 'success', message: 'Ordre d\'arrêt du SLAM publié' });
};

module.exports = {
  getTelemetry,
  moveRobot,
  stopRobot,
  toggleEmergency,
  getConfig,
  resetSlam,
  saveMap,
  getMaps,
  loadMap,
  startSlam,
  stopSlam
};