#!/bin/bash

# CONFIGURATION
ROBOT_USER="ubuntu"
ROBOT_IP="172.20.10.2"       
ROBOT_PASS="turtlebot"        
DEST_FOLDER="./public/maps"   

# Génération d'un nom unique
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MAP_NAME="map_$TIMESTAMP"

echo "Sauvegarde en cours..."


sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "source /opt/ros/noetic/setup.bash && rosrun map_server map_saver -f /tmp/$MAP_NAME"

echo "Téléchargement vers le serveur..."

sshpass -p "$ROBOT_PASS" scp -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP:/tmp/$MAP_NAME.* $DEST_FOLDER/

sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "rm /tmp/$MAP_NAME.*"

echo "Carte sauvegardée : $MAP_NAME"