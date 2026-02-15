# NavBot – Version 0 (MVP)

NavBot est une application web de téléopération et de cartographie pour robot mobile.

Note importante :
L'objectif final est de déployer cette solution sur un TurtleBot 4.
Pour ce MVP (Version 0), le développement et les tests sont réalisés sur un TurtleBot 3 (Burger).

---

## Pré-requis & Configuration

Avant de lancer le projet, assurez-vous que :
1. Le Robot et le PC Serveur sont connectés sur le même réseau Wi-Fi.
2. Vous avez récupéré l'adresse IP du robot.

### Configuration de l'IP
Dans le fichier frontend/src/config/config.js, mettez à jour la variable avec l'IP du robot :

// Exemple
export const ROSBRIDGE_URL = "ws://192.168.1.XX:9090";

---

## Lancer le projet (Version 0)

Le lancement se fait en deux étapes : d'abord le robot (via SSH), puis l'interface web.

### Étape 1 : Setup Côté Robot (SSH)

Connectez-vous au robot :
ssh ubuntu@<IP_DU_ROBOT>
# Entrez le mot de passe

Une fois connecté, exécutez les commandes suivantes (dans des terminaux séparés) :

1. Lancer le Rosbridge (Websocket)
roslaunch rosbridge_server rosbridge_websocket.launch

2. Démarrer le Core et le Robot
roscore

# Dans un autre terminal :
roslaunch turtlebot3_bringup turtlebot3_robot.launch

3. Lancer le retour vidéo (Caméra)
Si le robot possède une caméra, lancez ces commandes pour activer le flux sur la page de contrôle manuel :

source /opt/ros/humble/setup.bash
ros2 run web_video_server web_video_server

---

### Étape 2 : Setup Côté Interface (PC)

1. Cloner et installer
cd Navbot_V0/frontend
npm install

2. Lancer le serveur
npm run dev

L’application sera accessible sur : http://localhost:3000

---

## Utilisation (Cartographie & SLAM)

Pour lancer la cartographie (SLAM), lancez la commande suivante en SSH sur le robot :

export TURTLEBOT3_MODEL=burger
roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false

Fonctionnalités disponibles dans l'interface :
* Contrôle Manuel : Pilotage du robot en temps réel avec retour vidéo.
* Auto-Map : La carte se construit automatiquement via Gmapping.
* Save Map : Bouton pour enregistrer la carte générée.
* Reset : Bouton pour réinitialiser la cartographie.
