const mqttService = require('../services/mqttService');

const getActiveRobots = (req, res) => {
  const robots = mqttService.getActiveRobots();
  res.json({ status: 'success', robots });
};

const getTelemetry = (req, res) => {
  res.json({ status: 'ok' });
};

const moveRobot = (req, res) => {
  const { robotId, linear, angular } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });
  
  mqttService.publishVelocityCommand(robotId, linear, angular);
  res.json({ status: 'success', message: 'Commande publiee' });
};

const stopRobot = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishVelocityCommand(robotId, 0.0, 0.0);
  res.json({ status: 'success', message: 'Arret publie' });
};

const toggleEmergency = (req, res) => {
  const { robotId, state } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });
  
  if (state === 'on') {
    mqttService.publishVelocityCommand(robotId, 0.0, 0.0);
    mqttService.publishSystemCommand(robotId, 'emergency_stop');
  } else {
    mqttService.publishSystemCommand(robotId, 'emergency_release');
  }
  
  res.json({ status: 'success', state });
};

const getConfig = (req, res) => {
  res.json({ ROSBRIDGE_URL: `ws://${req.hostname}:9090` });
};

const saveMap = (req, res) => {
  // On extrait mapName en plus de robotId
  const { robotId, mapName } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  // On transmet le mapName dans le paramètre extraData
  mqttService.publishSystemCommand(robotId, 'save_map', { mapName });
  res.json({ status: 'success', message: 'Save publie' });
};

const getMaps = (req, res) => {
  res.json({ maps: [] });
};

const loadMap = (req, res) => {
  const { robotId, mapName } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, `load_map:${mapName}`);
  res.json({ status: 'success', message: 'Load publie' });
};

const startSlam = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, 'start_slam');
  res.json({ status: 'success', message: 'Start SLAM publie' });
};

const resetSlam = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });
  
  mqttService.publishSystemCommand(robotId, 'reset_slam');
  res.json({ status: 'success', message: 'Reset publie' });
};


const stopSlam = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, 'stop_slam');
  res.json({ status: 'success', message: 'Stop SLAM publie' });
};



module.exports = {
  getActiveRobots,
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