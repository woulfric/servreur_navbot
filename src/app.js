const express = require('express');
const cors = require('cors');
const app = express();
const { PORT } = require('./config/config');
const { connectToDatabase } = require('./config/database');

// Initialisation
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const startServer = async () => {
    try {
        await connectToDatabase();

        const rosService = require('./services/rosService');
        const apiRoutes = require('./routes/apiRoutes');

        // Connexion à ROS
        rosService.connect();

        // Routes API
        app.use('/api', apiRoutes);

        // Lancement Serveur
        app.listen(PORT, () => {
            console.log(`Serveur NavBot lancé sur http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Impossible de démarrer le serveur:', error.message);
        process.exit(1);
    }
};

startServer();
