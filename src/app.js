const express = require('express');
const app = express();
const { PORT } = require('./config/config');
const rosService = require('./services/rosService');
const apiRoutes = require('./routes/apiRoutes');

// Initialisation
app.use(express.json());
app.use(express.static('public')); // Servir le dossier public (Frontend)

// Connexion à ROS
rosService.connect();

// Routes API
app.use('/api', apiRoutes); 

// Lancement Serveur
app.listen(PORT, () => {
    console.log(`Serveur NavBot lancé sur http://localhost:${PORT}`);
});