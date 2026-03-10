const mqttService = require('../services/mqttService');
const fs = require('fs');
const path = require('path');

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
  const mapsDir = path.join(__dirname, '../../public/maps'); 
  
  try {
    if (!fs.existsSync(mapsDir)) {
      return res.json({ maps: [] });
    }

    const files = fs.readdirSync(mapsDir);
    // On se base sur les fichiers .yaml pour lister les cartes (1 yaml = 1 carte)
    const yamlFiles = files.filter(f => f.endsWith('.yaml'));

    const mapsList = yamlFiles.map((file, index) => {
      const baseName = file.replace('.yaml', '');
      const filePath = path.join(mapsDir, file);
      const stats = fs.statSync(filePath);

      return {
        id: index + 1,
        name: baseName,
        description: 'Carte générée par le robot',
        size: (stats.size / 1024).toFixed(1) + ' KB', 
        created: stats.birthtime.toISOString().split('T')[0],
        lastModified: stats.mtime.toISOString().split('T')[0],
        robotCount: 0,
        pointsCount: 'N/A'
      };
    });

    res.json({ maps: mapsList });
  } catch (error) {
    console.error("Erreur lecture dossier maps:", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
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

const startBridge = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, 'start_bridge');
  res.json({ status: 'success', message: 'Start Bridge publie' });
};

const stopBridge = (req, res) => {
  const { robotId } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, 'stop_bridge');
  res.json({ status: 'success', message: 'Stop Bridge publie' });
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
  stopSlam,
  startBridge, 
  stopBridge    
};