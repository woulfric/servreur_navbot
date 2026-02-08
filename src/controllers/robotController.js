const rosService = require('../services/rosService');
const config = require('../config/config');

// État global de l'urgence (stocké en mémoire)
let isEmergency = false;

exports.getConfig = (req, res) => {
    res.json(config);
};

exports.getTelemetry = (req, res) => {
    // On ajoute le statut d'urgence à la télémétrie pour que le Front le sache
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
    // Le STOP passe TOUJOURS, même en urgence (sécurité)
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
        // Si urgence activée, on force l'arrêt immédiat
        const stopMsg = { op: 'publish', topic: '/cmd_vel', msg: { linear:{x:0,y:0,z:0}, angular:{x:0,y:0,z:0} } };
        rosService.send(stopMsg);
        console.log("ARRÊT D'URGENCE DÉCLENCHÉ");
    } else {
        console.log("Urgence levée");
    }
    res.json({ isEmergency });
};