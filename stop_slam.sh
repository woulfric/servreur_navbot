#!/bin/bash

# CONFIGURATION
ROBOT_USER="ubuntu"
ROBOT_IP="172.20.10.2"       
ROBOT_PASS="turtlebot"       

echo "Arrêt du SLAM..."

sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "pkill -f turtlebot3_slam"

echo "SLAM Arrêté."