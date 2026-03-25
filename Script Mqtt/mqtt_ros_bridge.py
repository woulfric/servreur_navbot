#!/usr/bin/env python
import rospy
import json
import os
import time
import datetime
import re
import zlib
import base64
import subprocess
import threading

import paho.mqtt.client as mqtt
import actionlib

from geometry_msgs.msg import Twist, PoseWithCovarianceStamped, Quaternion
from move_base_msgs.msg import MoveBaseAction, MoveBaseGoal
from tf.transformations import quaternion_from_euler

MQTT_BROKER = "138.68.110.228"
MQTT_PORT = 1883
MQTT_USERNAME = "navbot"
MQTT_PASSWORD = "turtlebot"

ROBOT_ID = "tb3_01"
TB3_MODEL = "burger"

cmd_pub = None
mqtt_client_ref = None
move_base_client = None

ROS_SETUP = "source /opt/ros/noetic/setup.bash"
CATKIN_SETUP = "source ~/catkin_ws/devel/setup.bash"
ENV_PREFIX = ROS_SETUP + " && " + CATKIN_SETUP + " && export TURTLEBOT3_MODEL=" + TB3_MODEL


def ensure_dir(directory_path):
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)


def run_shell(command):
    return subprocess.run(
        command,
        shell=True,
        executable="/bin/bash",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )


def run_shell_background(command, log_file="/tmp/navbot_bg.log"):
    subprocess.Popen(
        command,
        shell=True,
        executable="/bin/bash",
        stdout=open(log_file, "a"),
        stderr=open(log_file, "a")
    )


def rosnode_list():
    result = run_shell(ENV_PREFIX + " && rosnode list")
    if result.returncode != 0:
        return []
    output = result.stdout.decode("utf-8").strip()
    if not output:
        return []
    return output.splitlines()


def rosnode_exists(node_name):
    return node_name in rosnode_list()


def publish_mission_log(message, level="info", extra=None):
    global mqtt_client_ref

    payload = {
        "robotId": ROBOT_ID,
        "level": level,
        "message": message,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

    if extra is not None:
        payload["extra"] = extra

    try:
        if mqtt_client_ref is not None:
            mqtt_client_ref.publish(
                "navbot/" + ROBOT_ID + "/mission_status",
                json.dumps(payload),
                qos=1
            )
    except Exception:
        pass


def ensure_bringup():
    existing_nodes = rosnode_list()

    if "/turtlebot3_core" in existing_nodes or "/turtlebot3_lds" in existing_nodes:
        rospy.loginfo("Bringup deja actif.")
        return True

    rospy.loginfo("Bringup absent. Lancement en cours...")

    command = (
        ENV_PREFIX +
        " && roslaunch turtlebot3_bringup turtlebot3_robot.launch > /tmp/tb3_bringup.log 2>&1 &"
    )
    run_shell_background(command, "/tmp/tb3_bringup.log")

    time.sleep(10)

    existing_nodes = rosnode_list()
    if "/turtlebot3_core" in existing_nodes or "/turtlebot3_lds" in existing_nodes:
        rospy.loginfo("Bringup lance avec succes.")
        return True

    rospy.logwarn("Le bringup semble ne pas avoir demarre correctement.")
    return False


def stop_navigation():
    run_shell("pkill -f turtlebot3_navigation.launch")
    run_shell("pkill -f map_server")
    run_shell("pkill -f amcl")
    run_shell("pkill -f move_base")
    time.sleep(2)


def ensure_navigation(map_yaml_path):
    if rosnode_exists("/move_base") and rosnode_exists("/amcl"):
        rospy.loginfo("Navigation deja active.")
        return True

    rospy.loginfo("Navigation absente. Lancement avec la map : " + map_yaml_path)

    command = (
        ENV_PREFIX +
        " && roslaunch turtlebot3_navigation turtlebot3_navigation.launch map_file:=" +
        map_yaml_path +
        " open_rviz:=false > /tmp/tb3_navigation.log 2>&1 &"
    )
    run_shell_background(command, "/tmp/tb3_navigation.log")

    time.sleep(8)

    move_base_ok = rosnode_exists("/move_base")
    amcl_ok = rosnode_exists("/amcl")

    if move_base_ok and amcl_ok:
        rospy.loginfo("Navigation lancee avec succes.")
        return True

    rospy.logwarn("La navigation ne semble pas completement demarree.")
    return False


def save_runtime_map(map_payload, mission_id):
    if not isinstance(map_payload, dict):
        raise Exception("Le champ 'map' est invalide ou absent")

    map_name = map_payload.get("name")
    pgm_b64 = map_payload.get("pgm")
    yaml_b64 = map_payload.get("yaml")

    if not map_name:
        raise Exception("Le nom de la map est manquant dans la mission")

    if not pgm_b64 or not yaml_b64:
        raise Exception("Les donnees PGM/YAML sont manquantes dans la mission")

    safe_map_name = re.sub(r'[^a-zA-Z0-9_-]', '_', map_name)
    safe_mission_id = re.sub(r'[^a-zA-Z0-9_-]', '_', mission_id if mission_id else "mission_runtime")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    runtime_dir = os.path.join(script_dir, "maps_runtime", safe_mission_id)

    ensure_dir(runtime_dir)

    pgm_path = os.path.join(runtime_dir, safe_map_name + ".pgm")
    yaml_path = os.path.join(runtime_dir, safe_map_name + ".yaml")

    try:
        pgm_data = zlib.decompress(base64.b64decode(pgm_b64))
        yaml_data = zlib.decompress(base64.b64decode(yaml_b64))
    except Exception as e:
        raise Exception("Echec decompression map mission : " + str(e))

    with open(pgm_path, "wb") as f:
        f.write(pgm_data)

    with open(yaml_path, "wb") as f:
        f.write(yaml_data)

    rospy.loginfo("Map mission ecrite localement : " + pgm_path)
    rospy.loginfo("YAML mission ecrit localement : " + yaml_path)

    return {
        "map_name": safe_map_name,
        "runtime_dir": runtime_dir,
        "pgm_path": pgm_path,
        "yaml_path": yaml_path
    }


def create_quaternion_from_yaw(yaw):
    q = quaternion_from_euler(0.0, 0.0, yaw)
    quat = Quaternion()
    quat.x = q[0]
    quat.y = q[1]
    quat.z = q[2]
    quat.w = q[3]
    return quat


def publish_initial_pose(x, y, yaw):
    pub = rospy.Publisher("/initialpose", PoseWithCovarianceStamped, queue_size=1, latch=True)
    time.sleep(1.0)

    msg = PoseWithCovarianceStamped()
    msg.header.stamp = rospy.Time.now()
    msg.header.frame_id = "map"

    msg.pose.pose.position.x = x
    msg.pose.pose.position.y = y
    msg.pose.pose.position.z = 0.0
    msg.pose.pose.orientation = create_quaternion_from_yaw(yaw)

    msg.pose.covariance[0] = 0.25
    msg.pose.covariance[7] = 0.25
    msg.pose.covariance[35] = 0.0685

    pub.publish(msg)
    rospy.loginfo("Pose initiale publiee sur /initialpose")


def send_goal_to_move_base(x, y, yaw):
    global move_base_client

    if move_base_client is None:
        move_base_client = actionlib.SimpleActionClient("move_base", MoveBaseAction)

    rospy.loginfo("Attente du serveur move_base...")
    if not move_base_client.wait_for_server(rospy.Duration(15)):
        rospy.logerr("Le serveur move_base n'est pas disponible.")
        return False

    goal = MoveBaseGoal()
    goal.target_pose.header.frame_id = "map"
    goal.target_pose.header.stamp = rospy.Time.now()
    goal.target_pose.pose.position.x = float(x)
    goal.target_pose.pose.position.y = float(y)
    goal.target_pose.pose.position.z = 0.0
    goal.target_pose.pose.orientation = create_quaternion_from_yaw(float(yaw))

    rospy.loginfo("Envoi du goal move_base | x=%.3f y=%.3f yaw=%.3f" % (x, y, yaw))
    move_base_client.send_goal(goal)

    finished = move_base_client.wait_for_result(rospy.Duration(180))
    if not finished:
        rospy.logwarn("Timeout move_base. Goal annule.")
        move_base_client.cancel_goal()
        return False

    state = move_base_client.get_state()
    rospy.loginfo("Etat final move_base : " + str(state))
    return state == 3


def execute_fake_action(poi, poi_index, total_pois):
    poi_name = str(poi.get("name", "POI_sans_nom"))

    rospy.loginfo("Debut action vide pour le POI #{0}/{1} : {2}".format(
        poi_index + 1, total_pois, poi_name
    ))
    publish_mission_log(
        "Action vide demarree",
        extra={"poiIndex": poi_index, "poiName": poi_name}
    )

    for i in range(1, 11):
        rospy.loginfo("Action vide | POI {0} | compteur {1}/10".format(poi_name, i))
        time.sleep(1)

    rospy.loginfo("Fin action vide pour le POI : " + poi_name)
    publish_mission_log(
        "Action vide terminee",
        extra={"poiIndex": poi_index, "poiName": poi_name}
    )


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        rospy.loginfo("Connecte au broker MQTT")
    else:
        rospy.logwarn("Connexion MQTT avec code " + str(rc))
        return

    status_topic = "navbot/" + ROBOT_ID + "/status"
    client.publish(status_topic, json.dumps({"state": "online"}), qos=1, retain=True)

    client.subscribe("navbot/" + ROBOT_ID + "/cmd_vel", qos=1)
    client.subscribe("navbot/" + ROBOT_ID + "/sys_cmd", qos=1)
    client.subscribe("navbot/" + ROBOT_ID + "/mission", qos=1)

    rospy.loginfo("Souscription aux topics du robot " + ROBOT_ID)


def on_disconnect(client, userdata, rc):
    if rc != 0:
        rospy.logwarn("Deconnecte du broker MQTT de maniere inattendue. Code: " + str(rc))
    else:
        rospy.loginfo("Deconnexion propre du broker MQTT")


def execute_mission(payload):
    mission_id = str(payload.get("missionId", "mission_runtime"))
    plan_name = str(payload.get("planName", "unknown_plan"))

    rospy.loginfo("Mission recue pour le robot " + ROBOT_ID)
    rospy.loginfo("Mission ID : " + mission_id)
    rospy.loginfo("Plan : " + plan_name)

    publish_mission_log(
        "Mission recue",
        extra={"missionId": mission_id, "planName": plan_name}
    )

    map_payload = payload.get("map", {})
    map_name = map_payload.get("name", "map_inconnue")
    rospy.loginfo("Carte : " + map_name)

    runtime_map_info = save_runtime_map(map_payload, mission_id)

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

    if len(pois) == 0:
        rospy.logwarn("Aucun POI dans la mission.")
        publish_mission_log("Mission vide", level="warn")
        return

    stop_navigation()
    nav_ok = ensure_navigation(runtime_map_info["yaml_path"])
    if not nav_ok:
        rospy.logerr("Navigation non disponible. Mission abandonnee.")
        publish_mission_log("Navigation indisponible", level="error")
        return

    rospy.logwarn("Important : le robot doit etre dans le bon environnement et localise sur la map.")
    rospy.logwarn("Si la pose initiale n'est pas connue, move_base risque d'echouer.")

    total_pois = len(pois)

    for poi_index, poi in enumerate(pois):
        poi_name = str(poi.get("name", "POI_sans_nom"))
        goal_x = float(poi.get("x", 0.0))
        goal_y = float(poi.get("y", 0.0))
        goal_yaw = float(poi.get("yaw", 0.0))

        rospy.loginfo("Navigation vers le POI #{0}/{1} : {2}".format(
            poi_index + 1, total_pois, poi_name
        ))
        publish_mission_log(
            "Navigation vers POI",
            extra={
                "poiIndex": poi_index,
                "poiName": poi_name,
                "x": goal_x,
                "y": goal_y,
                "yaw": goal_yaw
            }
        )

        success = send_goal_to_move_base(goal_x, goal_y, goal_yaw)

        if not success:
            rospy.logwarn("Echec ou timeout sur le POI : " + poi_name)
            publish_mission_log(
                "Echec navigation POI",
                level="warn",
                extra={"poiIndex": poi_index, "poiName": poi_name}
            )
            return

        rospy.loginfo("POI atteint : " + poi_name)
        publish_mission_log(
            "POI atteint",
            extra={"poiIndex": poi_index, "poiName": poi_name}
        )

        execute_fake_action(poi, poi_index, total_pois)

    rospy.loginfo("Mission terminee avec succes.")
    publish_mission_log("Mission terminee", extra={"missionId": mission_id})


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
            rospy.loginfo("cmd_vel recu | linear=%.3f angular=%.3f" % (twist.linear.x, twist.angular.z))

        elif topic == "navbot/" + ROBOT_ID + "/mission":
            mission_thread = threading.Thread(target=execute_mission, args=(payload,))
            mission_thread.daemon = True
            mission_thread.start()

        elif topic == "navbot/" + ROBOT_ID + "/sys_cmd":
            action = payload.get('action')
            rospy.loginfo("Commande systeme recue : " + str(action))

            if action == "start_slam":
                cmd = ENV_PREFIX + " && roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 &"
                os.system(cmd)
                rospy.loginfo("Process SLAM demarre localement.")

            elif action == "stop_slam":
                os.system("pkill -f turtlebot3_slam")
                rospy.loginfo("Process SLAM arrete.")

            elif action == "reset_slam":
                os.system("pkill -f turtlebot3_slam")
                rospy.loginfo("Arret du SLAM. Attente de 4 secondes pour liberer le roscore...")
                time.sleep(4)
                cmd = ENV_PREFIX + " && roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping open_rviz:=false > /tmp/slam.log 2>&1 &"
                os.system(cmd)
                rospy.loginfo("Process SLAM redemarre.")

            elif action == "start_bridge":
                cmd = ENV_PREFIX + " && roslaunch rosbridge_server rosbridge_websocket.launch > /tmp/bridge.log 2>&1 &"
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

                cmd = ENV_PREFIX + " && rosrun map_server map_saver -f " + map_path
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

    ensure_bringup()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=ROBOT_ID)
    mqtt_client_ref = client

    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    client.reconnect_delay_set(min_delay=2, max_delay=10)

    status_topic = "navbot/" + ROBOT_ID + "/status"
    lwt_payload = json.dumps({"state": "offline"})
    client.will_set(status_topic, lwt_payload, qos=1, retain=True)

    rospy.loginfo("Tentative connexion broker " + MQTT_BROKER + ":" + str(MQTT_PORT))

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        rospy.spin()

    except Exception as e:
        rospy.logerr("Erreur critique: " + str(e))

    finally:
        try:
            client.publish(status_topic, lwt_payload, qos=1, retain=True)
            client.disconnect()
            client.loop_stop()
        except Exception:
            pass


if __name__ == '__main__':
    main()