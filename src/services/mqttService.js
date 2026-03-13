const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');
// const client = mqtt.connect('mqtt://broker.hivemq.com:1883');
const activeRobots = new Map();

client.on('connect', () => {
  console.log('Service MQTT connecte');
  
  client.subscribe('navbot/+/telemetry');
  client.subscribe('navbot/+/status');
});

client.on('message', (topic, message) => {
  const parts = topic.split('/');
  
  // Mise a jour du registre des robots actifs
  if (parts.length === 3 && parts[2] === 'status') {
    const robotId = parts[1];
    const payload = JSON.parse(message.toString());
    
    if (payload.state === 'online') {
      activeRobots.set(robotId, { 
        id: robotId, 
        lastSeen: Date.now(), 
        status: 'online' 
      });
    } else {
      activeRobots.delete(robotId);
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

module.exports = {
  publishVelocityCommand,
  publishSystemCommand,
  getActiveRobots,
  client
};