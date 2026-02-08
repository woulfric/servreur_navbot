const express = require('express');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static('public'));

// connexion ros bridge
const ROSBRIDGE_URL = 'ws://localhost:9090';
const rosWs = new WebSocket(ROSBRIDGE_URL);

let robotData = {
    x: 0.0,
    y: 0.0,
    battery: 100.0 // Valeur par défaut
};



rosWs.on('open', () => {
  console.log('Connected to rosbridge');

  // Odométrie 
    rosWs.send(JSON.stringify({
        op: 'subscribe',
        topic: '/odom',
        type: 'nav_msgs/msg/Odometry'
    }));

    //batterie
    rosWs.send(JSON.stringify({
        op: 'subscribe',
        topic: '/battery_state',
        type: 'sensor_msgs/msg/BatteryState'
    }));
});

rosWs.on('error', (err) => {
  console.error('Rosbridge error:', err);
});


// rosWs.on('message', (data) => {
//   console.log('Rosbridge message:', data.toString());
// });


rosWs.on('message', (data) => {
    try {
        const msg = JSON.parse(data);
        
        if (msg.topic === '/odom') {
            // On récupère X et Y
            robotData.x = msg.msg.pose.pose.position.x;
            robotData.y = msg.msg.pose.pose.position.y;
        } 
        else if (msg.topic === '/battery_state') {
            // En simu, la batterie peut être en % (0-1) ou (0-100) selon le modèle
            // On s'assure d'avoir un format propre
            let val = msg.msg.percentage; 
            // Si c'est un chiffre petit (ex: 0.98), on met en %
            if (val <= 1) val = val * 100; 
            robotData.battery = val;
        }
    } catch (e) {
        console.error("Erreur parsing message ROS", e);
    }
});


// Health check endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'server is good'
  });
});


// Route pour récupérer les infos de télémétrie
app.get('/telemetry', (req, res) => {
    res.json(robotData);
});



app.post('/move', (req, res) => {
  if (rosWs.readyState !== WebSocket.OPEN) {
    return res.status(500).json({ error: 'Not connected to rosbridge' });
  }

  // linear request 
  const { linear = 0.1, angular = 0.0 } = req.body;

  const msg = {
    op: 'publish',
    topic: '/cmd_vel',         // ros topic
    // type: 'geometry_msgs/Twist',
    msg: {
      linear: { x: linear, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angular }
    }
  };                          

  rosWs.send(JSON.stringify(msg));
  res.json({ status: 'sent', msg });
});




app.post('/stop', (req, res) => {
  if (rosWs.readyState !== WebSocket.OPEN) {
    return res.status(500).json({ error: 'Not connected to rosbridge' });
  }

  const stopMsg = {
    op: 'publish',
    topic: '/cmd_vel', // same topic
    // type: 'geometry_msgs/Twist',
    msg: {
      linear:  { x: 0.0, y: 0.0, z: 0.0 },
      angular: { x: 0.0, y: 0.0, z: 0.0 }
    }
  };

  rosWs.send(JSON.stringify(stopMsg));
  res.json({ status: 'sent', msg: stopMsg });
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
