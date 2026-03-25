const express = require('express');
const router = express.Router();
const robotController = require('../controllers/robotController');

router.get('/active', robotController.getActiveRobots);
router.get('/robots', robotController.getRobots);
router.get('/telemetry', robotController.getTelemetry);
router.post('/move', robotController.moveRobot);
router.post('/stop', robotController.stopRobot);
router.post('/emergency', robotController.toggleEmergency);
router.get('/config', robotController.getConfig);
router.post('/reset_slam', robotController.resetSlam);
router.post('/save_map', robotController.saveMap);
router.get('/maps', robotController.getMaps);
router.post('/load_map', robotController.loadMap);
router.post('/start_slam', robotController.startSlam);
router.post('/stop_slam', robotController.stopSlam);
router.post('/start_bridge', robotController.startBridge);
router.post('/stop_bridge', robotController.stopBridge);

router.post('/poi-maps', robotController.savePoiMap);
router.get('/poi-maps', robotController.listPoiMaps);
router.get('/poi-maps/:mapName', robotController.getPoiMap);

router.post('/start_mission', robotController.startMission);
router.get('/missions', robotController.listMissions);
router.get('/missions/:missionId/logs', robotController.getMissionLogs);

module.exports = router;
