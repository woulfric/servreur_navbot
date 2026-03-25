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

const upsertMapMetadata = async (robotId, mapName) => {
  if (!mapName) {
    return;
  }

  await MapModel.findOneAndUpdate(
    { mapName },
    {
      $set: {
        robotId: robotId || 'unknown',
        apiPath: `/maps/${mapName}`,
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

const handleMapUpload = async (robotId, message) => {
  const payload = JSON.parse(message.toString());
  const { mapName, pgm, yaml } = payload;

  const targetDir = path.join(__dirname, '../../public/maps');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const pgmBuffer = zlib.unzipSync(Buffer.from(pgm, 'base64'));
  const yamlBuffer = zlib.unzipSync(Buffer.from(yaml, 'base64'));

  fs.writeFileSync(path.join(targetDir, `${mapName}.pgm`), pgmBuffer);
  fs.writeFileSync(path.join(targetDir, `${mapName}.yaml`), yamlBuffer);

  await upsertMapMetadata(robotId, mapName);

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
  client,
};
