const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mqttService = require('../services/mqttService');
const { ROSBRIDGE_URL } = require('../config/config');
const MapModel = require('../models/Map');
const Mission = require('../models/Mission');
const MissionLog = require('../models/MissionLog');
const MissionPlan = require('../models/MissionPlan');
const Robot = require('../models/Robot');

const mapsDir = path.join(__dirname, '../../public/maps');
const poiMapsDir = path.join(__dirname, '../../public/POIMaps');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const ensureMapsDir = () => {
  ensureDir(mapsDir);
};

const ensurePoiMapsDir = () => {
  ensureDir(poiMapsDir);
};

const sanitizeFileName = (name) => {
  return String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_');
};

const toIsoDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toISOString();
};

const toDisplayDate = (value) => {
  return toIsoDate(value).split('T')[0];
};

const findMapBaseName = (mapName) => {
  ensureMapsDir();

  const requestedName = String(mapName || '').trim();
  const safeRequestedName = sanitizeFileName(requestedName);
  const yamlFiles = fs
    .readdirSync(mapsDir)
    .filter((file) => file.endsWith('.yaml'));

  const exactMatch = yamlFiles.find(
    (file) => file.replace('.yaml', '') === requestedName
  );

  if (exactMatch) {
    return exactMatch.replace('.yaml', '');
  }

  const sanitizedMatch = yamlFiles.find((file) => {
    const baseName = file.replace('.yaml', '');
    return sanitizeFileName(baseName) === safeRequestedName;
  });

  if (sanitizedMatch) {
    return sanitizedMatch.replace('.yaml', '');
  }

  return requestedName;
};

const normalizePoi = (poi, index) => {
  const fallbackName = `POI ${index + 1}`;
  const rawId = poi && poi.id ? String(poi.id) : `poi_${Date.now()}_${index}`;
  const rawName = poi && poi.name ? String(poi.name).trim() : fallbackName;
  const updatedAt =
    poi && poi.updatedAt ? new Date(poi.updatedAt) : null;

  return {
    id: rawId,
    name: rawName || fallbackName,
    x: Number(poi && poi.x !== undefined ? poi.x : 0),
    y: Number(poi && poi.y !== undefined ? poi.y : 0),
    yaw: Number(poi && poi.yaw !== undefined ? poi.yaw : 0),
    type: poi && poi.type ? String(poi.type) : 'Other',
    description: poi && poi.description ? String(poi.description) : '',
    priority: poi && poi.priority ? String(poi.priority) : 'Medium',
    status: poi && poi.status ? String(poi.status) : 'Active',
    visits: Number(poi && poi.visits !== undefined ? poi.visits : 0),
    created:
      poi && poi.created
        ? String(poi.created)
        : new Date().toISOString().split('T')[0],
    updatedAt,
  };
};

const importPlanFromJsonFile = async (planName) => {
  ensurePoiMapsDir();

  const safePlanName = sanitizeFileName(planName);
  const filePath = path.join(poiMapsDir, `${safePlanName}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const stats = fs.statSync(filePath);

  const document = await MissionPlan.findOneAndUpdate(
    { planName: safePlanName },
    {
      $set: {
        mapName: sanitizeFileName(parsed.mapName || safePlanName),
        metadata: parsed.metadata || null,
        pois: Array.isArray(parsed.pois)
          ? parsed.pois.map((poi, index) => normalizePoi(poi, index))
          : [],
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : stats.mtime,
      },
      $setOnInsert: {
        createdAt: stats.birthtime,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return document;
};

const importAllPlanFiles = async () => {
  ensurePoiMapsDir();

  const files = fs
    .readdirSync(poiMapsDir)
    .filter((file) => file.endsWith('.json'));

  for (const file of files) {
    const planName = file.replace('.json', '');
    await importPlanFromJsonFile(planName);
  }
};

const getMissionPlanDocument = async (planName) => {
  const safePlanName = sanitizeFileName(planName);

  let document = await MissionPlan.findOne({ planName: safePlanName }).lean();

  if (document) {
    return document;
  }

  document = await importPlanFromJsonFile(safePlanName);
  return document;
};

const syncMapsFromDisk = async () => {
  ensureMapsDir();

  const yamlFiles = fs
    .readdirSync(mapsDir)
    .filter((file) => file.endsWith('.yaml'));

  for (const file of yamlFiles) {
    const baseName = file.replace('.yaml', '');
    const filePath = path.join(mapsDir, file);
    const stats = fs.statSync(filePath);

    await MapModel.findOneAndUpdate(
      { mapName: baseName },
      {
        $set: {
          apiPath: `/maps/${baseName}`,
        },
        $setOnInsert: {
          robotId: 'unknown',
          createdAt: stats.birthtime,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }
};

const mapDocumentToResponse = (mapDocument) => {
  const yamlPath = path.join(mapsDir, `${mapDocument.mapName}.yaml`);
  const stats = fs.existsSync(yamlPath) ? fs.statSync(yamlPath) : null;

  return {
    id: String(mapDocument._id),
    name: mapDocument.mapName,
    robotId: mapDocument.robotId || 'unknown',
    description: 'Carte generee par le robot',
    size: stats ? `${(stats.size / 1024).toFixed(1)} KB` : 'N/A',
    created: toDisplayDate(mapDocument.createdAt || (stats && stats.birthtime)),
    lastModified: toDisplayDate(stats ? stats.mtime : mapDocument.createdAt),
    robotCount: 0,
    pointsCount: 'N/A',
  };
};

const missionDocumentToResponse = (missionDocument) => {
  return {
    id: String(missionDocument._id),
    missionId: missionDocument.missionId,
    robotId: missionDocument.robotId,
    planName: missionDocument.planName,
    mapName: missionDocument.mapName,
    status: missionDocument.status,
    createdAt: toIsoDate(missionDocument.createdAt),
    updatedAt: toIsoDate(missionDocument.updatedAt || missionDocument.createdAt),
  };
};

const missionLogDocumentToResponse = (logDocument) => {
  return {
    id: String(logDocument._id),
    missionId: logDocument.missionId,
    robotId: logDocument.robotId || null,
    level: logDocument.level || 'info',
    message: logDocument.message,
    extra: logDocument.extra || null,
    timestamp: toIsoDate(logDocument.timestamp),
  };
};

const robotDocumentToResponse = (robotDocument, activeRobotIds) => {
  const robotId = robotDocument.robotId;

  return {
    id: robotId,
    robotId,
    name: robotDocument.name || robotId,
    type: robotDocument.type || 'unknown',
    status: activeRobotIds.has(robotId) ? 'online' : 'offline',
    createdAt: toIsoDate(robotDocument.createdAt),
  };
};

const getActiveRobots = (req, res) => {
  const robots = mqttService.getActiveRobots();
  res.json({ status: 'success', robots });
};

const getRobots = async (req, res) => {
  try {
    const activeRobots = mqttService.getActiveRobots();
    const activeRobotIds = new Set(activeRobots.map((robot) => robot.robotId || robot.id));
    const storedRobots = await Robot.find().sort({ createdAt: 1, robotId: 1 }).lean();

    const robotsById = new Map();

    storedRobots.forEach((robotDocument) => {
      const responseRobot = robotDocumentToResponse(robotDocument, activeRobotIds);
      robotsById.set(responseRobot.id, responseRobot);
    });

    activeRobots.forEach((activeRobot) => {
      if (robotsById.has(activeRobot.id)) {
        return;
      }

      robotsById.set(activeRobot.id, {
        id: activeRobot.id,
        robotId: activeRobot.robotId || activeRobot.id,
        name: activeRobot.name || activeRobot.id,
        type: activeRobot.type || 'unknown',
        status: 'online',
        createdAt: toIsoDate(new Date()),
      });
    });

    res.json({
      status: 'success',
      robots: Array.from(robotsById.values()),
    });
  } catch (error) {
    console.error('Erreur lecture des robots:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la lecture des robots' });
  }
};

const getTelemetry = (req, res) => {
  const { robotId } = req.query;

  if (robotId) {
    return res.json({
      status: 'success',
      robotId,
      telemetry: mqttService.getRobotTelemetry(robotId),
    });
  }

  res.json({
    status: 'success',
    telemetry: mqttService.getAllTelemetry(),
  });
};

const moveRobot = (req, res) => {
  const { robotId, linear, angular } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishVelocityCommand(robotId, linear, angular);
  res.json({ status: 'success', message: 'Commande publiee' });
};

const stopRobot = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishVelocityCommand(robotId, 0.0, 0.0);
  res.json({ status: 'success', message: 'Arret publie' });
};

const toggleEmergency = (req, res) => {
  const { robotId, state } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  if (state === 'on') {
    mqttService.publishVelocityCommand(robotId, 0.0, 0.0);
    mqttService.publishSystemCommand(robotId, 'emergency_stop');
  } else {
    mqttService.publishSystemCommand(robotId, 'emergency_release');
  }

  res.json({ status: 'success', state });
};

const getConfig = (req, res) => {
  res.json({ ROSBRIDGE_URL });
};

const saveMap = (req, res) => {
  const { robotId, mapName } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'save_map', { mapName });
  res.json({ status: 'success', message: 'Save publie' });
};

const getMaps = async (req, res) => {
  try {
    await syncMapsFromDisk();

    const maps = await MapModel.find().sort({ createdAt: -1 }).lean();

    const mapsList = maps
      .filter((mapDocument) =>
        fs.existsSync(path.join(mapsDir, `${mapDocument.mapName}.yaml`))
      )
      .map((mapDocument) => mapDocumentToResponse(mapDocument));

    res.json({ maps: mapsList });
  } catch (error) {
    console.error('Erreur lecture des maps:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const loadMap = (req, res) => {
  const { robotId, mapName } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, `load_map:${mapName}`);
  res.json({ status: 'success', message: 'Load publie' });
};

const startSlam = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'start_slam');
  res.json({ status: 'success', message: 'Start SLAM publie' });
};

const resetSlam = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'reset_slam');
  res.json({ status: 'success', message: 'Reset publie' });
};

const stopSlam = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'stop_slam');
  res.json({ status: 'success', message: 'Stop SLAM publie' });
};

const startBridge = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'start_bridge');
  res.json({ status: 'success', message: 'Start Bridge publie' });
};

const stopBridge = (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId manquant' });
  }

  mqttService.publishSystemCommand(robotId, 'stop_bridge');
  res.json({ status: 'success', message: 'Stop Bridge publie' });
};

const savePoiMap = async (req, res) => {
  try {
    const { mapName, metadata, pois } = req.body;

    if (!mapName) {
      return res.status(400).json({ error: 'mapName manquant' });
    }

    if (!Array.isArray(pois)) {
      return res.status(400).json({ error: 'pois invalide' });
    }

    const safeMapName = sanitizeFileName(mapName);
    const normalizedPois = pois.map((poi, index) => normalizePoi(poi, index));

    const plan = await MissionPlan.findOneAndUpdate(
      { planName: safeMapName },
      {
        $set: {
          mapName: safeMapName,
          metadata: metadata || null,
          pois: normalizedPois,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    res.json({
      status: 'success',
      message: 'Plan POI sauvegarde',
      fileName: `${safeMapName}.json`,
      planId: String(plan._id),
    });
  } catch (error) {
    console.error('Erreur sauvegarde POI map:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la sauvegarde du plan POI' });
  }
};

const getPoiMap = async (req, res) => {
  try {
    const { mapName } = req.params;

    if (!mapName) {
      return res.status(400).json({ error: 'mapName manquant' });
    }

    const safeMapName = sanitizeFileName(mapName);
    const plan = await getMissionPlanDocument(safeMapName);

    if (!plan) {
      return res.json({
        status: 'success',
        planName: safeMapName,
        mapName: safeMapName,
        metadata: null,
        pois: [],
      });
    }

    res.json({
      status: 'success',
      planName: plan.planName,
      mapName: plan.mapName,
      metadata: plan.metadata || null,
      pois: Array.isArray(plan.pois) ? plan.pois : [],
      createdAt: toIsoDate(plan.createdAt),
      updatedAt: toIsoDate(plan.updatedAt || plan.createdAt),
    });
  } catch (error) {
    console.error('Erreur lecture POI map:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la lecture du plan POI' });
  }
};

const listPoiMaps = async (req, res) => {
  try {
    await importAllPlanFiles();

    const plans = await MissionPlan.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const poiMaps = plans.map((plan) => ({
      id: String(plan._id),
      name: plan.planName,
      mapName: plan.mapName,
      poisCount: Array.isArray(plan.pois) ? plan.pois.length : 0,
      updatedAt: toIsoDate(plan.updatedAt || plan.createdAt),
      createdAt: toIsoDate(plan.createdAt),
    }));

    res.json({
      status: 'success',
      poiMaps,
    });
  } catch (error) {
    console.error('Erreur listing POI maps:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors du listing des plans POI' });
  }
};

const startMission = async (req, res) => {
  try {
    const { robotId, missionId, planName } = req.body;

    if (!robotId) {
      return res.status(400).json({ error: 'robotId manquant' });
    }

    if (!planName) {
      return res.status(400).json({ error: 'planName manquant' });
    }

    const safePlanName = sanitizeFileName(planName);
    const plan = await getMissionPlanDocument(safePlanName);

    if (!plan) {
      return res.status(404).json({ error: 'Plan POI introuvable' });
    }

    const resolvedMapBaseName = findMapBaseName(plan.mapName);
    const safeMapName = sanitizeFileName(plan.mapName);
    const pgmPath = path.join(mapsDir, `${resolvedMapBaseName}.pgm`);
    const yamlPath = path.join(mapsDir, `${resolvedMapBaseName}.yaml`);

    if (!fs.existsSync(pgmPath) || !fs.existsSync(yamlPath)) {
      return res.status(404).json({
        error: 'Fichiers de map introuvables',
        details: {
          pgmExists: fs.existsSync(pgmPath),
          yamlExists: fs.existsSync(yamlPath),
          mapName: plan.mapName,
        },
      });
    }

    const resolvedMissionId = missionId || `mission_${Date.now()}`;
    const pgmBuffer = fs.readFileSync(pgmPath);
    const yamlBuffer = fs.readFileSync(yamlPath);

    const missionPayload = {
      missionId: resolvedMissionId,
      robotId,
      planName: safePlanName,
      map: {
        name: resolvedMapBaseName,
        pgm: zlib.deflateSync(pgmBuffer).toString('base64'),
        yaml: zlib.deflateSync(yamlBuffer).toString('base64'),
      },
      metadata: plan.metadata || null,
      pois: Array.isArray(plan.pois) ? plan.pois : [],
      createdAt: new Date().toISOString(),
    };

    await Mission.findOneAndUpdate(
      { missionId: resolvedMissionId },
      {
        $set: {
          robotId,
          planName: safePlanName,
          mapName: resolvedMapBaseName,
          status: 'Pending',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    mqttService.publishMissionCommand(robotId, missionPayload);

    res.json({
      status: 'success',
      message: 'Mission publiee au robot',
      missionPreview: {
        missionId: missionPayload.missionId,
        robotId: missionPayload.robotId,
        planName: missionPayload.planName,
        mapName: missionPayload.map.name,
        poisCount: missionPayload.pois.length,
      },
    });
  } catch (error) {
    console.error('Erreur lancement mission:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors du lancement de la mission' });
  }
};

const listMissions = async (req, res) => {
  try {
    const missions = await Mission.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      missions: missions.map((mission) => missionDocumentToResponse(mission)),
    });
  } catch (error) {
    console.error('Erreur lecture missions:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la lecture des missions' });
  }
};

const getMissionLogs = async (req, res) => {
  try {
    const { missionId } = req.params;

    if (!missionId) {
      return res.status(400).json({ error: 'missionId manquant' });
    }

    const logs = await MissionLog.find({ missionId })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      status: 'success',
      missionId,
      logs: logs.map((log) => missionLogDocumentToResponse(log)),
    });
  } catch (error) {
    console.error('Erreur lecture mission logs:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la lecture des logs de mission' });
  }
};

module.exports = {
  getActiveRobots,
  getRobots,
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
  listMissions,
  getMissionLogs,
};
