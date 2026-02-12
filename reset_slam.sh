#!/bin/bash

# CONFIGURATION DU ROBOT
ROBOT_USER="ubuntu"         
ROBOT_IP="172.20.10.2"       
ROBOT_PASS="turtlebot"      

echo "Connexion au robot ${ROBOT_IP}..."

echo "Arrêt du SLAM..."

sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "pkill -f turtlebot3_slam"

sleep 4

CMD="export TURTLEBOT3_MODEL=burger; \
source /opt/ros/noetic/setup.bash; \
source /home/ubuntu/catkin_ws/devel/setup.bash; \
nohup roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 & disown"

echo "Redémarrage du SLAM sur le robot..."
sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "$CMD"

echo "Ordre de redémarrage envoyé !"