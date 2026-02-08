const express = require('express');
const router = express.Router();
const robotController = require('../controllers/robotController');

router.get('/telemetry', robotController.getTelemetry);
router.post('/move', robotController.moveRobot);
router.post('/stop', robotController.stopRobot);
router.post('/emergency', robotController.toggleEmergency);
router.get('/config', robotController.getConfig);

module.exports = router;