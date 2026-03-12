#!/usr/bin/env python
import rospy
import json
import os
import time
import datetime
import re
import zlib
import base64
import paho.mqtt.client as mqtt
from geometry_msgs.msg import Twist

MQTT_BROKER = "172.20.10.4"
MQTT_PORT = 1883
ROBOT_ID = "tb3_01"

cmd_pub = None
mqtt_client_ref = None

def on_connect(client, userdata, flags, rc):
    rospy.loginfo("Connecte au broker MQTT avec le code " + str(rc))

    status_topic = "navbot/" + ROBOT_ID + "/status"
    client.publish(status_topic, json.dumps({"state": "online"}), qos=1, retain=True)

    client.subscribe("navbot/" + ROBOT_ID + "/cmd_vel")
    client.subscribe("navbot/" + ROBOT_ID + "/sys_cmd")
    client.subscribe("navbot/" + ROBOT_ID + "/mission")

def on_message(client, userdata, msg):
    global cmd_pub
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        topic = msg.topic

        if topic == "navbot/" + ROBOT_ID + "/cmd_vel":
            twist = Twist()
            twist.linear.x = float(payload.get('linear', 0.0))
            twist.angular.z = float(payload.get('angular', 0.0))
            cmd_pub.publish(twist)

        elif topic == "navbot/" + ROBOT_ID + "/mission":
            rospy.loginfo("Mission recue pour le robot " + ROBOT_ID)
            rospy.loginfo("Mission ID : " + str(payload.get("missionId")))
            rospy.loginfo("Plan : " + str(payload.get("planName")))
            rospy.loginfo("Carte : " + str(payload.get("mapName")))

            pois = payload.get("pois", [])
            rospy.loginfo("Nombre de POI : " + str(len(pois)))

            for index, poi in enumerate(pois):
                rospy.loginfo(
                    "POI #{0} | nom={1} | x={2} | y={3} | type={4}".format(
                        index + 1,
                        str(poi.get("name")),
                        str(poi.get("x")),
                        str(poi.get("y")),
                        str(poi.get("type"))
                    )
                )

        elif topic == "navbot/" + ROBOT_ID + "/sys_cmd":
            action = payload.get('action')
            rospy.loginfo("Commande systeme recue : " + str(action))

            if action == "start_slam":
                cmd = "export TURTLEBOT3_MODEL=burger && roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 &"
                os.system(cmd)
                rospy.loginfo("Process SLAM demarre localement.")

            elif action == "stop_slam":
                os.system("pkill -f turtlebot3_slam")
                rospy.loginfo("Process SLAM arrete.")

            elif action == "reset_slam":
                os.system("pkill -f turtlebot3_slam")
                rospy.loginfo("Arret du SLAM. Attente de 4 secondes pour liberer le roscore...")
                time.sleep(4)
                cmd = "export TURTLEBOT3_MODEL=burger && roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 &"
                os.system(cmd)
                rospy.loginfo("Process SLAM redemarre.")

            elif action == "start_bridge":
                cmd = "roslaunch rosbridge_server rosbridge_websocket.launch > /tmp/bridge.log 2>&1 &"
                os.system(cmd)
                rospy.loginfo("Process rosbridge demarre.")

            elif action == "stop_bridge":
                os.system("pkill -f rosbridge_websocket")
                rospy.loginfo("Process rosbridge arrete.")

            elif action == "save_map":
                raw_map_name = payload.get('mapName', '')

                if not raw_map_name:
                    raw_map_name = "map_" + datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

                safe_map_name = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_map_name)

                script_dir = os.path.dirname(os.path.abspath(__file__))
                maps_dir = os.path.join(script_dir, "maps")

                if not os.path.exists(maps_dir):
                    os.makedirs(maps_dir)

                base_name = safe_map_name
                counter = 1
                map_path = os.path.join(maps_dir, base_name)

                while os.path.exists(map_path + ".yaml"):
                    base_name = "{}_{}".format(safe_map_name, counter)
                    map_path = os.path.join(maps_dir, base_name)
                    counter += 1

                cmd = "rosrun map_server map_saver -f " + map_path
                os.system(cmd)
                rospy.loginfo("Carte brute sauvegardee sous : " + map_path)

                time.sleep(2)

                try:
                    with open(map_path + ".pgm", "rb") as f:
                        pgm_data = f.read()
                    with open(map_path + ".yaml", "rb") as f:
                        yaml_data = f.read()

                    pgm_b64 = base64.b64encode(zlib.compress(pgm_data)).decode('utf-8')
                    yaml_b64 = base64.b64encode(zlib.compress(yaml_data)).decode('utf-8')

                    upload_topic = "navbot/" + ROBOT_ID + "/map_upload"
                    upload_payload = json.dumps({
                        "mapName": base_name,
                        "pgm": pgm_b64,
                        "yaml": yaml_b64
                    })

                    client.publish(upload_topic, upload_payload, qos=1)
                    rospy.loginfo("Carte compressee et envoyee au serveur via MQTT.")
                except Exception as e_file:
                    rospy.logerr("Erreur lors de la compression/envoi de la carte : " + str(e_file))

    except Exception as e:
        rospy.logerr("Erreur traitement message: " + str(e))

def main():
    global cmd_pub, mqtt_client_ref

    rospy.init_node('mqtt_ros_bridge', anonymous=True)
    cmd_pub = rospy.Publisher('/cmd_vel', Twist, queue_size=10)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    mqtt_client_ref = client
    client.on_connect = on_connect
    client.on_message = on_message

    status_topic = "navbot/" + ROBOT_ID + "/status"
    lwt_payload = json.dumps({"state": "offline"})
    client.will_set(status_topic, lwt_payload, qos=1, retain=True)

    rospy.loginfo("Tentative connexion broker " + MQTT_BROKER)
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        rospy.spin()
    except Exception as e:
        rospy.logerr("Erreur critique: " + str(e))
    finally:
        client.publish(status_topic, lwt_payload, qos=1, retain=True)
        client.disconnect()
        client.loop_stop()

if __name__ == '__main__':
    main()