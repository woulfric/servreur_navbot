#!/bin/bash

# CONFIGURATION
ROBOT_USER="ubuntu"
ROBOT_IP="172.20.10.2"      
ROBOT_PASS="turtlebot"     

echo "Lancement du SLAM à distance..."


CMD="export TURTLEBOT3_MODEL=burger; \
source /opt/ros/noetic/setup.bash; \
source /home/ubuntu/catkin_ws/devel/setup.bash; \
nohup roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 & disown"


sshpass -p "$ROBOT_PASS" ssh -o StrictHostKeyChecking=no $ROBOT_USER@$ROBOT_IP "$CMD"

echo "SLAM Démarré !"