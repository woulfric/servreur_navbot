const mqtt = require('mqtt');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// conention au broker MQTT local sur le port 1883
// const client = mqtt.connect('mqtt://localhost:1883');

const client = mqtt.connect('mqtt://138.68.110.228:1883', {
  username: 'navbot',
  password: 'turtlebot'
});

const activeRobots = new Map();

client.on('connect', () => {
  console.log('Service MQTT connecte');

  client.subscribe('navbot/+/telemetry');
  client.subscribe('navbot/+/status');
  client.subscribe('navbot/+/map_upload');
});

client.on('message', (topic, message) => {
  const parts = topic.split('/');

  if (parts.length === 3 && parts[2] === 'status') {
    const robotId = parts[1];
    const payload = JSON.parse(message.toString());

    if (payload.state === 'online') {
      activeRobots.set(robotId, {
        id: robotId,
        name: robotId,
        lastSeen: Date.now(),
        status: 'online',
      });
    } else {
      activeRobots.delete(robotId);
    }
  }

  if (parts.length === 3 && parts[2] === 'map_upload') {
    try {
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

      console.log(`[MQTT] Carte "${mapName}" recue, decompressee et sauvegardee avec succes.`);
    } catch (err) {
      console.error('[MQTT] Erreur lors du traitement de la carte :', err);
    }
  }
});

const getActiveRobots = () => {
  return Array.from(activeRobots.values());
};

const publishVelocityCommand = (robotId, linear, angular) => {
  if (!robotId) return;

  const topic = `navbot/${robotId}/cmd_vel`;
  const payload = JSON.stringify({ linear, angular });

  client.publish(topic, payload, { qos: 0 });
};

const publishSystemCommand = (robotId, commandAction, extraData = {}) => {
  if (!robotId) return;

  const topic = `navbot/${robotId}/sys_cmd`;
  const payload = JSON.stringify({ action: commandAction, ...extraData });

  client.publish(topic, payload, { qos: 1 });
};

const publishMissionCommand = (robotId, missionPayload) => {
  if (!robotId) return;

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