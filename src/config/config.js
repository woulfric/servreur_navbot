require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    // ROSBRIDGE_URL: process.env.ROSBRIDGE_URL || 'ws://localhost:9090',
    ROSBRIDGE_URL: process.env.ROSBRIDGE_URL || 'ws://172.20.10.2:9090',
};