const mqtt = require('mqtt');

// Connexion au broker local Mosquitto
const client = mqtt.connect('mqtt://localhost:1883');
// const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

client.on('connect', () => {
  console.log('Service MQTT Node.js connecté au Broker Mosquitto');
  
  // On s'abonne aux topics de télémétrie de tous les robots (+)
  client.subscribe('navbot/+/telemetry', (err) => {
    if (err) console.error('Erreur abonnement télémétrie:', err);
  });
});

client.on('message', (topic, message) => {
  // Ici on traitera les retours des robots (batterie, odométrie)
  // pour les envoyer au front-end plus tard
  // console.log(`Message reçu sur ${topic}: ${message.toString()}`);
});

client.on('error', (error) => {
  console.error('Erreur de connexion MQTT:', error);
});

// Méthode pour envoyer les commandes de vélocité
const publishVelocityCommand = (robotId, linear, angular) => {
  const topic = `navbot/${robotId}/cmd_vel`;
  const payload = JSON.stringify({ linear, angular });
  
  client.publish(topic, payload, { qos: 0 }, (err) => {
    if (err) console.error(`Erreur publication sur ${topic}`, err);
  });
};

// Méthode pour envoyer des ordres système (start_slam, save_map)
const publishSystemCommand = (robotId, commandAction) => {
  const topic = `navbot/${robotId}/sys_cmd`;
  const payload = JSON.stringify({ action: commandAction });
  
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error(`Erreur publication sur ${topic}`, err);
  });
};

module.exports = {
  publishVelocityCommand,
  publishSystemCommand,
  client
};