require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/navbot',
    ROSBRIDGE_URL: process.env.ROSBRIDGE_URL || 'wss://ros.navbot.dev',
    // ROSBRIDGE_URL: process.env.ROSBRIDGE_URL || 'ws://172.20.10.2:9090',
    // ROSBRIDGE_URL: process.env.ROSBRIDGE_URL || 'ws://172.20.10.8:9090',
};
