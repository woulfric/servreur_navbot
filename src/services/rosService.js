const WebSocket = require('ws');
const { ROSBRIDGE_URL } = require('../config/config');

class RosService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.robotData = { x: 0.0, y: 0.0, battery: 0 };
    }

    connect() {
        this.ws = new WebSocket(ROSBRIDGE_URL);

        this.ws.on('open', () => {
            console.log('Service ROS : Connecté au Bridge');
            this.isConnected = true;
            this.subscribeToTopics();
        });

        this.ws.on('error', (err) => {
            console.error('Service ROS : Erreur', err.message);
            this.isConnected = false;
        });

        this.ws.on('close', () => {
            console.warn('Service ROS : Déconnecté');
            this.isConnected = false;
        });

        this.ws.on('message', (data) => this.handleMessage(data));
    }

    subscribeToTopics() {
        // Odométrie
        this.send({ op: 'subscribe', topic: '/odom', type: 'nav_msgs/msg/Odometry' });
        // Batterie
        this.send({ op: 'subscribe', topic: '/battery_state', type: 'sensor_msgs/msg/BatteryState' });
    }

    handleMessage(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.topic === '/odom') {
                this.robotData.x = msg.msg.pose.pose.position.x;
                this.robotData.y = msg.msg.pose.pose.position.y;
            } else if (msg.topic === '/battery_state') {
                let val = msg.msg.percentage;
                if (val <= 1) val *= 100;
                this.robotData.battery = val;
            }
        } catch (error) {
            console.error("Parsing error", error);
        }
    }

    send(msgJSON) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msgJSON));
        } else {
            console.warn("Impossible d'envoyer : Non connecté à ROS");
        }
    }

    getTelemetry() {
        return this.robotData;
    }
}

module.exports = new RosService();