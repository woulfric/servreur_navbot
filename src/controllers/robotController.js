const rosService = require('../services/rosService');
const config = require('../config/config');
const { exec } = require('child_process');
const path = require('path');


let isEmergency = false;

exports.getConfig = (req, res) => {
    res.json(config);
};

exports.getTelemetry = (req, res) => {
    const data = rosService.getTelemetry();
    res.json({ ...data, emergency: isEmergency });
};

exports.moveRobot = (req, res) => {
    if (isEmergency) {
        return res.status(403).json({ error: "URGENCE ACTIVE", status: 'blocked' });
    }

    const { linear, angular } = req.body;
    const msg = {
        op: 'publish',
        topic: '/cmd_vel',
        msg: {
            linear:  { x: parseFloat(linear || 0), y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: parseFloat(angular || 0) }
        }
    };
    rosService.send(msg);
    res.json({ status: 'sent', cmd: { linear, angular } });
};

exports.stopRobot = (req, res) => {
    const msg = {
        op: 'publish', topic: '/cmd_vel',
        msg: { linear: {x:0,y:0,z:0}, angular: {x:0,y:0,z:0} }
    };
    rosService.send(msg);
    res.json({ status: 'stopped' });
};

exports.toggleEmergency = (req, res) => {
    const { state } = req.body; // 'on' ou 'off'
    isEmergency = (state === 'on');
    
    if (isEmergency) {
        const stopMsg = { op: 'publish', topic: '/cmd_vel', msg: { linear:{x:0,y:0,z:0}, angular:{x:0,y:0,z:0} } };
        rosService.send(stopMsg);
        console.log("ARRÊT D'URGENCE DÉCLENCHÉ");
    } else {
        console.log("Urgence levée");
    }
    res.json({ isEmergency });
};

exports.resetSlam = (req, res) => {
    console.log("Demande de Reset SLAM reçue...");

    const scriptPath = path.join(__dirname, '../../reset_slam.sh');

    exec(scriptPath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur Reset: ${error.message}`);
        }
        if (stderr) console.error(`Stderr: ${stderr}`);
        console.log(`Stdout: ${stdout}`);
        
        res.json({ status: 'success', message: 'Cycle de reset lancé' });
    });
};

exports.saveMap = (req, res) => {
    console.log("Demande de sauvegarde de map...");

    const scriptPath = path.join(__dirname, '../../save_map.sh');

    exec(scriptPath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur sauvegarde: ${error.message}`);
            return res.status(500).json({ status: 'error', message: error.message });
        }
        
        console.log(`Map sauvegardée !`);
        res.json({ status: 'success', details: stdout });
    });
};

exports.getMaps = (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const mapsDir = path.join(__dirname, '../../public/maps');

    fs.readdir(mapsDir, (err, files) => {
        if (err) return res.json({ maps: [] });
        
        const maps = files.filter(f => f.endsWith('.yaml'));
        res.json({ status: 'success', maps: maps });
    });
};

exports.loadMap = (req, res) => {
    const mapName = req.body.mapName;
    const scriptPath = path.join(__dirname, '../../load_map.sh'); 

    console.log(`Chargement de ${mapName}...`);

    exec(`${scriptPath} ${mapName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ status: 'error' });
        }
        console.log(stdout);
        res.json({ status: 'success' });
    });
};

exports.startSlam = (req, res) => {
    console.log("Demande de démarrage SLAM...");
    const scriptPath = path.join(__dirname, '../../start_slam.sh');

    exec(scriptPath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur Start: ${error.message}`);
            return res.status(500).json({ status: 'error', message: error.message });
        }
        console.log(`Start Output: ${stdout}`);
        res.json({ status: 'success', message: 'SLAM Démarré' });
    });
};

exports.stopSlam = (req, res) => {
    console.log("Demande d'arrêt SLAM...");
    const scriptPath = path.join(__dirname, '../../stop_slam.sh');

    exec(scriptPath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur Stop: ${error.message}`);
        }
        console.log(`Stop Output: ${stdout}`);
        res.json({ status: 'success', message: 'SLAM Arrêté' });
    });
};