#!/bin/bash
# load_map.sh

# CONFIGURATION
ROBOT_USER="ubuntu"
ROBOT_IP="172.20.10.2"       
ROBOT_PASS="turtlebot"        
MAP_FILE=$1                   
LOCAL_PATH="./public/maps"
REMOTE_PATH="/home/ubuntu/current_map"

echo "Préparation de la carte : $MAP_FILE"

#  Création dossier sur le robot
sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "mkdir -p $REMOTE_PATH"

#  Envoi des fichiers (.yaml et .pgm)
BASE_NAME="${MAP_FILE%.yaml}"
echo "Envoi des fichiers..."
sshpass -p "$ROBOT_PASS" scp -o StrictHostKeyChecking=no $LOCAL_PATH/$BASE_NAME.* $ROBOT_USER@$ROBOT_IP:$REMOTE_PATH/

#  Nettoyage et lancement du map_server sur le robot
echo "Lancement du serveur de carte..."
sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "pkill -f map_server"

# Commande de lancement
CMD="export TURTLEBOT3_MODEL=burger; \
source /opt/ros/noetic/setup.bash; \
nohup rosrun map_server map_server $REMOTE_PATH/$MAP_FILE > /tmp/map_server.log 2>&1 &"

sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "$CMD"

echo "Carte chargée !"