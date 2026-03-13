const mqttService = require('../services/mqttService');
const fs = require('fs');
const path = require('path');

const mapsDir = path.join(__dirname, '../../public/maps');
const poiMapsDir = path.join(__dirname, '../../public/POIMaps');

const ensurePoiMapsDir = () => {
  if (!fs.existsSync(poiMapsDir)) {
    fs.mkdirSync(poiMapsDir, { recursive: true });
  }
};

const sanitizeFileName = (name) => {
  return String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_');
};

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
  const { robotId, mapName } = req.body;
  if (!robotId) return res.status(400).json({ error: 'robotId manquant' });

  mqttService.publishSystemCommand(robotId, 'save_map', { mapName });
  res.json({ status: 'success', message: 'Save publie' });
};

const getMaps = (req, res) => {
  try {
    if (!fs.existsSync(mapsDir)) {
      return res.json({ maps: [] });
    }

    const files = fs.readdirSync(mapsDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml'));

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
        pointsCount: 'N/A',
      };
    });

    res.json({ maps: mapsList });
  } catch (error) {
    console.error('Erreur lecture dossier maps:', error);
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

const savePoiMap = (req, res) => {
  try {
    ensurePoiMapsDir();

    const { mapName, metadata, pois } = req.body;

    if (!mapName) {
      return res.status(400).json({ error: 'mapName manquant' });
    }

    if (!Array.isArray(pois)) {
      return res.status(400).json({ error: 'pois invalide' });
    }

    const safeMapName = sanitizeFileName(mapName);
    const filePath = path.join(poiMapsDir, `${safeMapName}.json`);

    const payload = {
      mapName: safeMapName,
      metadata: metadata || null,
      pois,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    res.json({
      status: 'success',
      message: 'Plan POI sauvegardé',
      fileName: `${safeMapName}.json`,
    });
  } catch (error) {
    console.error('Erreur sauvegarde POI map:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde du plan POI' });
  }
};

const getPoiMap = (req, res) => {
  try {
    ensurePoiMapsDir();

    const { mapName } = req.params;

    if (!mapName) {
      return res.status(400).json({ error: 'mapName manquant' });
    }

    const safeMapName = sanitizeFileName(mapName);
    const filePath = path.join(poiMapsDir, `${safeMapName}.json`);

    if (!fs.existsSync(filePath)) {
      return res.json({
        status: 'success',
        mapName: safeMapName,
        metadata: null,
        pois: [],
      });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    res.json({
      status: 'success',
      ...parsed,
    });
  } catch (error) {
    console.error('Erreur lecture POI map:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la lecture du plan POI' });
  }
};

const listPoiMaps = (req, res) => {
  try {
    ensurePoiMapsDir();

    const files = fs.readdirSync(poiMapsDir).filter((file) => file.endsWith('.json'));

    const poiMaps = files.map((file, index) => {
      const filePath = path.join(poiMapsDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const stats = fs.statSync(filePath);

      return {
        id: index + 1,
        name: file.replace('.json', ''),
        mapName: parsed.mapName || file.replace('.json', ''),
        poisCount: Array.isArray(parsed.pois) ? parsed.pois.length : 0,
        updatedAt: parsed.updatedAt || stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString(),
      };
    });

    res.json({
      status: 'success',
      poiMaps,
    });
  } catch (error) {
    console.error('Erreur listing POI maps:', error);
    res.status(500).json({ error: 'Erreur serveur lors du listing des plans POI' });
  }
};

const startMission = (req, res) => {
  try {
    const { robotId, missionId, planName } = req.body;

    if (!robotId) {
      return res.status(400).json({ error: 'robotId manquant' });
    }

    if (!planName) {
      return res.status(400).json({ error: 'planName manquant' });
    }

    ensurePoiMapsDir();

    const safePlanName = sanitizeFileName(planName);
    const filePath = path.join(poiMapsDir, `${safePlanName}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Plan POI introuvable' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    const missionPayload = {
      missionId: missionId || `mission_${Date.now()}`,
      robotId,
      planName: safePlanName,
      mapName: parsed.mapName,
      metadata: parsed.metadata || null,
      pois: Array.isArray(parsed.pois) ? parsed.pois : [],
      createdAt: new Date().toISOString(),
    };

    mqttService.publishMissionCommand(robotId, missionPayload);

    res.json({
      status: 'success',
      message: 'Mission publiée au robot',
      mission: missionPayload,
    });
  } catch (error) {
    console.error('Erreur lancement mission:', error);
    res.status(500).json({ error: 'Erreur serveur lors du lancement de la mission' });
  }
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
  stopBridge,
  savePoiMap,
  getPoiMap,
  listPoiMaps,
  startMission,
};