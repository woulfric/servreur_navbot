const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mqtt = require('mqtt');
const MapModel = require('../models/Map');
const Mission = require('../models/Mission');
const MissionLog = require('../models/MissionLog');
const Robot = require('../models/Robot');

// connexion au broker MQTT cloud
const client = mqtt.connect('mqtt://138.68.110.228:1883', {
  username: 'navbot',
  password: 'turtlebot',
});

const activeRobots = new Map();
const currentMissionByRobot = new Map();
const telemetryByRobot = new Map();

const inferRobotType = (robotId) => {
  const normalizedRobotId = String(robotId || '').toLowerCase();

  if (normalizedRobotId.startsWith('tb3')) {
    return 'tb3';
  }

  if (normalizedRobotId.startsWith('tb4')) {
    return 'tb4';
  }

  return 'unknown';
};

const normalizeInitialPose = (initialPose) => {
  if (!initialPose || typeof initialPose !== 'object') {
    return null;
  }

  const x = Number(initialPose.x);
  const y = Number(initialPose.y);
  const yaw = Number(initialPose.yaw ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(yaw)) {
    return null;
  }

  return {
    x,
    y,
    yaw,
    capturedAt: initialPose.capturedAt ? new Date(initialPose.capturedAt) : new Date(),
    source: initialPose.source ? String(initialPose.source) : 'slam_start',
  };
};

const upsertRobotStatus = async (robotId, status) => {
  if (!robotId) {
    return;
  }

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        name: robotId,
        type: inferRobotType(robotId),
        status,
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
};

const upsertMapMetadata = async (robotId, mapName, extra = {}) => {
  if (!mapName) {
    return;
  }

  const update = {
    robotId: robotId || 'unknown',
    apiPath: `/maps/${mapName}`,
  };

  const normalizedInitialPose = normalizeInitialPose(extra.initialPose);
  if (normalizedInitialPose) {
    update.initialPose = normalizedInitialPose;
  }

  await MapModel.findOneAndUpdate(
    { mapName },
    {
      $set: update,
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
};

const resolveMissionId = (robotId, payload) => {
  const missionIdFromPayload =
    payload &&
    payload.extra &&
    payload.extra.missionId
      ? String(payload.extra.missionId)
      : null;

  if (missionIdFromPayload) {
    currentMissionByRobot.set(robotId, missionIdFromPayload);
    return missionIdFromPayload;
  }

  return currentMissionByRobot.get(robotId) || null;
};

const inferMissionStatus = (payload) => {
  const message = String(payload && payload.message ? payload.message : '').toLowerCase();
  const level = String(payload && payload.level ? payload.level : 'info').toLowerCase();

  if (message.includes('mission terminee')) {
    return 'Completed';
  }

  if (
    level === 'error' ||
    message.includes('echec') ||
    message.includes('abandonnee') ||
    message.includes('indisponible')
  ) {
    return 'Failed';
  }

  if (
    message.includes('mission recue') ||
    message.includes('navigation') ||
    message.includes('poi atteint')
  ) {
    return 'Running';
  }

  return null;
};

const handleRobotStatus = async (robotId, message) => {
  const payload = JSON.parse(message.toString());
  const robotType = inferRobotType(robotId);

  if (payload.state === 'online') {
    activeRobots.set(robotId, {
      id: robotId,
      robotId,
      name: robotId,
      type: robotType,
      lastSeen: Date.now(),
      status: 'online',
    });
    await upsertRobotStatus(robotId, 'online');
    return;
  }

  activeRobots.delete(robotId);
  await upsertRobotStatus(robotId, 'offline');
};

const toFiniteNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
};

const toIsoTimestamp = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const normalizeTelemetryPayload = (payload) => {
  const rawPercent =
    toFiniteNumber(payload && payload.batteryPercent) ??
    toFiniteNumber(payload && payload.battery_percentage) ??
    toFiniteNumber(payload && payload.percentage) ??
    toFiniteNumber(payload && payload.battery);

  const rawVoltage =
    toFiniteNumber(payload && payload.batteryVoltage) ??
    toFiniteNumber(payload && payload.battery_voltage) ??
    toFiniteNumber(payload && payload.voltage);

  let batteryPercent = rawPercent;

  if (batteryPercent !== null && batteryPercent <= 1) {
    batteryPercent *= 100;
  }

  if (batteryPercent !== null) {
    batteryPercent = Math.max(0, Math.min(100, Math.round(batteryPercent)));
  }

  const batteryVoltage =
    rawVoltage !== null && rawVoltage > 0
      ? Number(rawVoltage.toFixed(2))
      : null;

  return {
    batteryPercent,
    batteryVoltage,
    timestamp: toIsoTimestamp(payload && payload.timestamp),
  };
};

const handleRobotTelemetry = async (robotId, message) => {
  const payload = JSON.parse(message.toString());
  const telemetry = normalizeTelemetryPayload(payload);
  const existingRobot = activeRobots.get(robotId) || {
    id: robotId,
    robotId,
    name: robotId,
    type: inferRobotType(robotId),
    status: 'online',
  };

  telemetryByRobot.set(robotId, telemetry);
  activeRobots.set(robotId, {
    ...existingRobot,
    batteryPercent: telemetry.batteryPercent,
    batteryVoltage: telemetry.batteryVoltage,
    telemetryAt: telemetry.timestamp,
    lastSeen: Date.now(),
  });
};

const handleMapUpload = async (robotId, message) => {
  const payload = JSON.parse(message.toString());
  const { mapName, pgm, yaml, initialPose } = payload;

  const targetDir = path.join(__dirname, '../../public/maps');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const pgmBuffer = zlib.unzipSync(Buffer.from(pgm, 'base64'));
  const yamlBuffer = zlib.unzipSync(Buffer.from(yaml, 'base64'));

  fs.writeFileSync(path.join(targetDir, `${mapName}.pgm`), pgmBuffer);
  fs.writeFileSync(path.join(targetDir, `${mapName}.yaml`), yamlBuffer);

  await upsertMapMetadata(robotId, mapName, { initialPose });

  console.log(`[MQTT] Carte "${mapName}" recue, decompressee et sauvegardee.`);
};

const handleMissionStatus = async (robotId, message) => {
  const payload = JSON.parse(message.toString());
  const missionId = resolveMissionId(robotId, payload);

  if (!missionId) {
    return;
  }

  await MissionLog.create({
    missionId,
    robotId: payload.robotId || robotId,
    level: payload.level || 'info',
    message: payload.message || 'Log mission',
    extra: payload.extra || null,
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
  });

  const nextStatus = inferMissionStatus(payload);

  if (nextStatus) {
    await Mission.findOneAndUpdate(
      { missionId },
      {
        $set: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      }
    );
  }

  if (nextStatus === 'Completed' || nextStatus === 'Failed') {
    currentMissionByRobot.delete(robotId);
  }
};

client.on('connect', () => {
  console.log('Service MQTT connecte');

  client.subscribe('navbot/+/telemetry');
  client.subscribe('navbot/+/status');
  client.subscribe('navbot/+/map_upload');
  client.subscribe('navbot/+/mission_status');
});

client.on('message', async (topic, message) => {
  const parts = topic.split('/');

  if (parts.length !== 3) {
    return;
  }

  const robotId = parts[1];
  const channel = parts[2];

  try {
    if (channel === 'status') {
      await handleRobotStatus(robotId, message);
      return;
    }

    if (channel === 'telemetry') {
      await handleRobotTelemetry(robotId, message);
      return;
    }

    if (channel === 'map_upload') {
      await handleMapUpload(robotId, message);
      return;
    }

    if (channel === 'mission_status') {
      await handleMissionStatus(robotId, message);
    }
  } catch (error) {
    console.error(`[MQTT] Erreur traitement topic ${topic}:`, error.message);
  }
});

const getActiveRobots = () => {
  return Array.from(activeRobots.values());
};

const getRobotTelemetry = (robotId) => {
  if (!robotId) {
    return null;
  }

  return telemetryByRobot.get(robotId) || null;
};

const getAllTelemetry = () => {
  return Object.fromEntries(telemetryByRobot.entries());
};

const publishVelocityCommand = (robotId, linear, angular) => {
  if (!robotId) {
    return;
  }

  const topic = `navbot/${robotId}/cmd_vel`;
  const payload = JSON.stringify({ linear, angular });

  client.publish(topic, payload, { qos: 0 });
};

const publishSystemCommand = (robotId, commandAction, extraData = {}) => {
  if (!robotId) {
    return;
  }

  const topic = `navbot/${robotId}/sys_cmd`;
  const payload = JSON.stringify({ action: commandAction, ...extraData });

  client.publish(topic, payload, { qos: 1 });
};

const publishMissionCommand = (robotId, missionPayload) => {
  if (!robotId) {
    return;
  }

  currentMissionByRobot.set(robotId, missionPayload.missionId);

  const topic = `navbot/${robotId}/mission`;
  const payload = JSON.stringify(missionPayload);

  client.publish(topic, payload, { qos: 1 });
};

module.exports = {
  publishVelocityCommand,
  publishSystemCommand,
  publishMissionCommand,
  getActiveRobots,
  getRobotTelemetry,
  getAllTelemetry,
  client,
};
