#!/usr/bin/env python3
import base64
import datetime
import json
import math
import os
import re
import shlex
import subprocess
import threading
import time
import zlib

import paho.mqtt.client as mqtt
import rclpy
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped, TransformStamped, Twist
from nav_msgs.msg import Odometry
from nav2_msgs.action import NavigateToPose
from rclpy.action import ActionClient
from rclpy.duration import Duration
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import BatteryState
from tf2_ros import Buffer, TransformBroadcaster, TransformListener
from geometry_msgs.msg import PoseWithCovarianceStamped

MQTT_BROKER = "138.68.110.228"
MQTT_PORT = 1883
MQTT_USERNAME = "navbot"
MQTT_PASSWORD = "turtlebot"

ROBOT_ID = "tb4_01"

ROS_SETUP = "source /opt/ros/humble/setup.bash"
TB4_WS_SETUP = "if [ -f ~/turtlebot4_ws/install/setup.bash ]; then source ~/turtlebot4_ws/install/setup.bash; fi"
ENV_PREFIX = ROS_SETUP + " && " + TB4_WS_SETUP
VIDEO_STREAM_PORT = 8090


class MqttCmdVelBridge(Node):
    def __init__(self):
        super().__init__("mqtt_cmdvel_bridge_tb4")

        self.cmd_pub = self.create_publisher(Twist, "/cmd_vel", 10)
        self.last_battery_publish_time = 0.0
        self.last_odom_publish_time = 0.0
        self.last_amcl_pose_time = 0.0
        self.slam_initial_pose = None
        self.navigate_to_pose_client = ActionClient(self, NavigateToPose, "navigate_to_pose")
        self.tf_broadcaster = TransformBroadcaster(self)
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        self.initial_pose_pub = self.create_publisher(PoseWithCovarianceStamped, "/initialpose", 10)

        self.mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION1,
            client_id=ROBOT_ID
        )
        self.mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        self.mqtt_client.on_message = self.on_message

        status_topic = f"navbot/{ROBOT_ID}/status"
        lwt_payload = json.dumps({"state": "offline"})
        self.mqtt_client.will_set(status_topic, lwt_payload, qos=1, retain=True)

        self.get_logger().info(f"Connexion MQTT vers {MQTT_BROKER}:{MQTT_PORT}")

        self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        self.mqtt_client.loop_start()

        self.create_subscription(
            BatteryState,
            "/battery_state",
            self.on_battery,
            qos_profile_sensor_data
        )
        self.create_subscription(
            Odometry,
            "/odom",
            self.on_odom,
            qos_profile_sensor_data
        )
        self.create_subscription(
            PoseWithCovarianceStamped,
            "/amcl_pose",
            self.on_amcl_pose,
            10
        )

    def run_shell(self, command):
        return subprocess.run(
            command,
            shell=True,
            executable="/bin/bash",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

    def run_shell_background(self, command, log_file="/tmp/navbot_bg.log"):
        subprocess.Popen(
            command,
            shell=True,
            executable="/bin/bash",
            stdout=open(log_file, "a"),
            stderr=open(log_file, "a")
        )

    def is_process_running(self, process_pattern):
        result = self.run_shell("pgrep -f " + shlex.quote(process_pattern))
        return result.returncode == 0

    def ros2_node_list(self):
        result = self.run_shell(ENV_PREFIX + " && ros2 node list")

        if result.returncode != 0:
            return []

        output = result.stdout.decode("utf-8").strip()

        if not output:
            return []

        return output.splitlines()

    def ros2_node_exists(self, node_name):
        return node_name in self.ros2_node_list()

    def ros2_lifecycle_state(self, node_name):
        result = self.run_shell(
            ENV_PREFIX + " && ros2 lifecycle get " + shlex.quote(node_name)
        )

        if result.returncode != 0:
            return None

        output = result.stdout.decode("utf-8", errors="ignore").strip()
        patterns = [
            r"current state\s+([a-z_]+)",
            r"^([a-z_]+)\s*\[\d+\]$",
            r"state:\s*([a-z_]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, output, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).lower()

        return None

    def ros2_param_get(self, node_name, param_name):
        result = self.run_shell(
            ENV_PREFIX +
            " && ros2 param get " +
            shlex.quote(node_name) +
            " " +
            shlex.quote(param_name)
        )

        if result.returncode != 0:
            return None

        output = result.stdout.decode("utf-8", errors="ignore").strip()
        match = re.search(r".*?:\s*(.+)$", output)

        if not match:
            return None

        value = match.group(1).strip()

        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]

        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]

        return value

    def publish_mission_log(self, message, level="info", extra=None):
        payload = {
            "robotId": ROBOT_ID,
            "level": level,
            "message": message,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

        if extra is not None:
            payload["extra"] = extra

        try:
            self.mqtt_client.publish(
                f"navbot/{ROBOT_ID}/mission_status",
                json.dumps(payload),
                qos=1
            )
        except Exception:
            pass

    def goal_status_label(self, status_code):
        labels = {
            GoalStatus.STATUS_UNKNOWN: "UNKNOWN",
            GoalStatus.STATUS_ACCEPTED: "ACCEPTED",
            GoalStatus.STATUS_EXECUTING: "EXECUTING",
            GoalStatus.STATUS_CANCELING: "CANCELING",
            GoalStatus.STATUS_SUCCEEDED: "SUCCEEDED",
            GoalStatus.STATUS_CANCELED: "CANCELED",
            GoalStatus.STATUS_ABORTED: "ABORTED",
        }
        return labels.get(status_code, f"STATUS_{status_code}")

    def publish_battery_telemetry(self, voltage=None, percentage=None):
        payload = {
            "robotId": ROBOT_ID,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        if percentage is not None:
            payload["batteryPercent"] = int(round(percentage))

        if voltage is not None:
            payload["batteryVoltage"] = round(voltage, 2)

        try:
            self.mqtt_client.publish(
                f"navbot/{ROBOT_ID}/telemetry",
                json.dumps(payload),
                qos=1,
                retain=True
            )
        except Exception:
            pass

    def ensure_dir(self, directory_path):
        if not os.path.exists(directory_path):
            os.makedirs(directory_path)

    def has_recent_odom(self, max_age_seconds=3.0):
        if self.last_odom_publish_time <= 0.0:
            return False

        return (time.time() - self.last_odom_publish_time) <= max_age_seconds

    def has_recent_amcl_pose(self, max_age_seconds=3.0):
        if self.last_amcl_pose_time <= 0.0:
            return False

        return (time.time() - self.last_amcl_pose_time) <= max_age_seconds

    def stop_navigation(self):
        self.run_shell("pkill -f 'localization.launch.py'")
        self.run_shell("pkill -f 'nav2.launch.py'")
        self.run_shell("pkill -f bt_navigator")
        self.run_shell("pkill -f controller_server")
        self.run_shell("pkill -f planner_server")
        self.run_shell("pkill -f smoother_server")
        self.run_shell("pkill -f behavior_server")
        self.run_shell("pkill -f waypoint_follower")
        self.run_shell("pkill -f velocity_smoother")
        self.run_shell("pkill -f lifecycle_manager")
        self.run_shell("pkill -f amcl")
        self.run_shell("pkill -f map_server")
        time.sleep(2)

    def publish_initial_pose(self, x, y, yaw):
        for _ in range(3):
            msg = PoseWithCovarianceStamped()
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.header.frame_id = "map"
            msg.pose.pose.position.x = float(x)
            msg.pose.pose.position.y = float(y)
            msg.pose.pose.position.z = 0.0
            msg.pose.pose.orientation.x = 0.0
            msg.pose.pose.orientation.y = 0.0
            msg.pose.pose.orientation.z = math.sin(float(yaw) / 2.0)
            msg.pose.pose.orientation.w = math.cos(float(yaw) / 2.0)
            msg.pose.covariance[0] = 0.25
            msg.pose.covariance[7] = 0.25
            msg.pose.covariance[35] = 0.0685
            self.initial_pose_pub.publish(msg)
            time.sleep(0.3)

        self.get_logger().info(
            f"Pose initiale publiee | x={float(x):.3f} y={float(y):.3f} yaw={float(yaw):.3f}"
        )

    def lookup_robot_pose_in_map(self, timeout_seconds=20.0):
        deadline = time.time() + timeout_seconds
        candidate_frames = ["base_link", "base_footprint"]

        while time.time() < deadline:
            for base_frame in candidate_frames:
                try:
                    transform = self.tf_buffer.lookup_transform(
                        "map",
                        base_frame,
                        rclpy.time.Time(),
                        timeout=Duration(seconds=1.0)
                    )
                    q = transform.transform.rotation
                    yaw = math.atan2(
                        2.0 * (q.w * q.z + q.x * q.y),
                        1.0 - 2.0 * (q.y * q.y + q.z * q.z)
                    )

                    return {
                        "x": float(transform.transform.translation.x),
                        "y": float(transform.transform.translation.y),
                        "yaw": float(yaw),
                        "capturedAt": datetime.datetime.utcnow().isoformat() + "Z",
                        "source": "slam_start",
                    }
                except Exception:
                    continue

            time.sleep(0.2)

        return None

    def capture_slam_initial_pose_after_startup(self, startup_delay=5.0):
        time.sleep(startup_delay)
        pose = self.lookup_robot_pose_in_map(timeout_seconds=20.0)

        if pose is None:
            self.get_logger().warn("Impossible de capturer la pose initiale de cartographie sur la frame map.")
            return

        self.slam_initial_pose = pose
        self.get_logger().info(
            f"Pose initiale SLAM capturee | x={pose['x']:.3f} y={pose['y']:.3f} yaw={pose['yaw']:.3f}"
        )

    def schedule_slam_initial_pose_capture(self):
        capture_thread = threading.Thread(target=self.capture_slam_initial_pose_after_startup)
        capture_thread.daemon = True
        capture_thread.start()

    def has_map_to_base_transform(self):
        candidate_frames = ["base_link", "base_footprint"]

        for base_frame in candidate_frames:
            try:
                self.tf_buffer.lookup_transform(
                    "map",
                    base_frame,
                    rclpy.time.Time(),
                    timeout=Duration(seconds=0.5)
                )
                return True
            except Exception:
                continue

        return False

    def is_localization_available(self):
        return (
            self.ros2_node_exists("/amcl") and
            self.ros2_node_exists("/map_server") and
            self.has_recent_odom()
        )

    def is_navigation_action_ready(self):
        try:
            return self.navigate_to_pose_client.wait_for_server(timeout_sec=1.0)
        except Exception:
            return False

    def get_loaded_map_name(self):
        yaml_filename = self.ros2_param_get("/map_server", "yaml_filename")

        if not yaml_filename:
            return None

        return os.path.splitext(os.path.basename(str(yaml_filename)))[0]

    def can_reuse_existing_navigation(self, desired_map_name):
        if not self.is_localization_available():
            return False

        if not self.is_navigation_action_ready():
            return False

        loaded_map_name = self.get_loaded_map_name()

        if loaded_map_name is None:
            self.get_logger().info(
                "Impossible de lire la map actuellement chargee sur /map_server. Redemarrage navigation."
            )
            return False

        if loaded_map_name != desired_map_name:
            self.get_logger().info(
                f"Map active differente | chargee={loaded_map_name} mission={desired_map_name}"
            )
            return False

        return True

    def ensure_localization(self, map_yaml_path):
        if self.ros2_node_exists("/amcl") and self.ros2_node_exists("/map_server") and self.has_recent_odom():
            self.get_logger().info("Localisation deja active.")
            return True

        self.get_logger().info(f"Localisation absente. Lancement avec la map : {map_yaml_path}")

        quoted_map_yaml_path = shlex.quote(map_yaml_path)
        localization_command = (
            ENV_PREFIX +
            " && ros2 launch turtlebot4_navigation localization.launch.py"
            " map:=" + quoted_map_yaml_path
        )

        open("/tmp/tb4_localization.log", "w").close()
        self.run_shell_background(localization_command, "/tmp/tb4_localization.log")

        deadline = time.time() + 35.0
        last_debug_log_time = 0.0

        while time.time() < deadline:
            amcl_exists = self.ros2_node_exists("/amcl")
            map_server_exists = self.ros2_node_exists("/map_server")
            odom_ok = self.has_recent_odom()

            if amcl_exists and map_server_exists and odom_ok:
                self.get_logger().info("Localisation lancee avec succes.")
                return True

            now = time.time()
            if now - last_debug_log_time >= 5.0:
                self.get_logger().info(
                    "Attente localisation | amcl=%s map_server=%s odom=%s" %
                    (amcl_exists, map_server_exists, odom_ok)
                )
                last_debug_log_time = now

            time.sleep(1.0)

        if not self.has_recent_odom():
            self.get_logger().warn("Aucune odometrie recente recue sur /odom. TF odom -> base_link indisponible.")

        self.get_logger().warn("La localisation ne semble pas completement demarree.")
        return False

    def ensure_nav2_stack(self):
        required_nodes = [
            "/controller_server",
            "/planner_server",
            "/behavior_server",
            "/bt_navigator",
        ]

        if all(self.ros2_lifecycle_state(node_name) == "active" for node_name in required_nodes):
            self.get_logger().info("Stack Nav2 deja active.")
            return True

        self.get_logger().info("Lancement de la stack Nav2.")

        nav2_command = ENV_PREFIX + " && ros2 launch turtlebot4_navigation nav2.launch.py"
        open("/tmp/tb4_navigation.log", "w").close()
        self.run_shell_background(nav2_command, "/tmp/tb4_navigation.log")

        deadline = time.time() + 90.0
        last_debug_log_time = 0.0

        while time.time() < deadline:
            lifecycle_states = {
                node_name: self.ros2_lifecycle_state(node_name)
                for node_name in required_nodes
            }
            action_server_ready = self.navigate_to_pose_client.wait_for_server(timeout_sec=1.0)

            if all(state == "active" for state in lifecycle_states.values()) and action_server_ready:
                self.get_logger().info("Stack Nav2 lancee avec succes.")
                return True

            now = time.time()
            if now - last_debug_log_time >= 10.0:
                self.get_logger().info(
                    f"Attente stack Nav2 | etats={lifecycle_states} action_server={action_server_ready}"
                )
                last_debug_log_time = now

            time.sleep(1.0)

        final_states = {
            node_name: self.ros2_lifecycle_state(node_name)
            for node_name in required_nodes
        }
        final_action_server_ready = self.navigate_to_pose_client.wait_for_server(timeout_sec=1.0)
        self.get_logger().warn(
            f"Etat final stack Nav2 | etats={final_states} action_server={final_action_server_ready}"
        )
        self.get_logger().warn("La stack Nav2 ne semble pas completement demarree.")
        return False

    def save_runtime_map(self, map_payload, mission_id):
        if not isinstance(map_payload, dict):
            raise Exception("Le champ 'map' est invalide ou absent")

        map_name = map_payload.get("name")
        pgm_b64 = map_payload.get("pgm")
        yaml_b64 = map_payload.get("yaml")

        if not map_name:
            raise Exception("Le nom de la map est manquant dans la mission")

        if not pgm_b64 or not yaml_b64:
            raise Exception("Les donnees PGM/YAML sont manquantes dans la mission")

        safe_map_name = re.sub(r"[^a-zA-Z0-9_-]", "_", map_name)
        safe_mission_id = re.sub(r"[^a-zA-Z0-9_-]", "_", mission_id if mission_id else "mission_runtime")

        script_dir = os.path.dirname(os.path.abspath(__file__))
        runtime_dir = os.path.join(script_dir, "maps_runtime", safe_mission_id)

        self.ensure_dir(runtime_dir)

        pgm_path = os.path.join(runtime_dir, safe_map_name + ".pgm")
        yaml_path = os.path.join(runtime_dir, safe_map_name + ".yaml")

        try:
            pgm_data = zlib.decompress(base64.b64decode(pgm_b64))
            yaml_data = zlib.decompress(base64.b64decode(yaml_b64))
        except Exception as error:
            raise Exception("Echec decompression map mission : " + str(error))

        try:
            yaml_text = yaml_data.decode("utf-8")
        except Exception as error:
            raise Exception("Echec lecture YAML mission : " + str(error))

        with open(pgm_path, "wb") as pgm_file:
            pgm_file.write(pgm_data)

        yaml_lines = yaml_text.splitlines()
        image_line_rewritten = False
        sanitized_yaml_lines = []
        runtime_image_reference = os.path.basename(pgm_path)

        for line in yaml_lines:
            if re.match(r"^\s*image\s*:", line):
                indent_match = re.match(r"^(\s*)", line)
                indent = indent_match.group(1) if indent_match else ""
                sanitized_yaml_lines.append(f"{indent}image: {runtime_image_reference}")
                image_line_rewritten = True
            else:
                sanitized_yaml_lines.append(line)

        if not image_line_rewritten:
            sanitized_yaml_lines.insert(0, f"image: {runtime_image_reference}")

        yaml_text = "\n".join(sanitized_yaml_lines) + "\n"

        with open(yaml_path, "wb") as yaml_file:
            yaml_file.write(yaml_text.encode("utf-8"))

        self.get_logger().info(f"Map mission ecrite localement : {pgm_path}")
        self.get_logger().info(f"YAML mission ecrit localement : {yaml_path}")
        self.get_logger().info(
            f"YAML mission image re-ecrite vers : {runtime_image_reference}"
        )

        return {
            "map_name": safe_map_name,
            "runtime_dir": runtime_dir,
            "pgm_path": pgm_path,
            "yaml_path": yaml_path
        }

    def create_pose(self, x, y, yaw):
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = "map"
        goal_pose.header.stamp = self.get_clock().now().to_msg()
        goal_pose.pose.position.x = float(x)
        goal_pose.pose.position.y = float(y)
        goal_pose.pose.position.z = 0.0
        goal_pose.pose.orientation.x = 0.0
        goal_pose.pose.orientation.y = 0.0
        goal_pose.pose.orientation.z = math.sin(float(yaw) / 2.0)
        goal_pose.pose.orientation.w = math.cos(float(yaw) / 2.0)
        return goal_pose

    def prepare_navigator(self):
        try:
            if self.navigate_to_pose_client.wait_for_server(timeout_sec=15.0):
                return True
        except Exception as error:
            self.get_logger().error(f"Impossible de joindre NavigateToPose : {error}")

        self.get_logger().error("Le serveur NavigateToPose n'est pas disponible.")
        return False

    def wait_for_localization(self, timeout_seconds=20.0):
        deadline = time.time() + timeout_seconds

        while time.time() < deadline:
            if self.has_recent_amcl_pose() and self.has_map_to_base_transform():
                self.get_logger().info("AMCL a publie une pose recente et la TF map -> base est disponible.")
                return True

            time.sleep(0.2)

        self.get_logger().warn("AMCL n'a pas encore stabilise la localisation apres la pose initiale.")
        return False

    def send_goal_to_nav2(self, x, y, yaw):
        try:
            goal_pose = self.create_pose(x, y, yaw)
            goal = NavigateToPose.Goal()
            goal.pose = goal_pose
            self.get_logger().info(
                f"Envoi du goal Nav2 | x={float(x):.3f} y={float(y):.3f} yaw={float(yaw):.3f}"
            )
            send_event = threading.Event()
            result_event = threading.Event()
            result_state = {"goal_handle": None, "accepted": False, "status": None}

            def handle_goal_response(future):
                try:
                    goal_handle = future.result()
                    result_state["goal_handle"] = goal_handle
                    result_state["accepted"] = goal_handle is not None and goal_handle.accepted

                    if result_state["accepted"]:
                        result_future = goal_handle.get_result_async()
                        result_future.add_done_callback(handle_result_response)
                except Exception as error:
                    self.get_logger().error(f"Erreur reponse goal Nav2 : {error}")
                finally:
                    send_event.set()

            def handle_result_response(future):
                try:
                    result = future.result()
                    result_state["status"] = result.status
                except Exception as error:
                    self.get_logger().error(f"Erreur resultat Nav2 : {error}")
                finally:
                    result_event.set()

            send_goal_future = self.navigate_to_pose_client.send_goal_async(goal)
            send_goal_future.add_done_callback(handle_goal_response)

            if not send_event.wait(timeout=15.0):
                self.get_logger().error("Timeout envoi goal Nav2.")
                return False

            if not result_state["accepted"]:
                self.get_logger().warn("Goal Nav2 refuse.")
                return False

            self.get_logger().info("Goal Nav2 accepte. Attente du resultat...")

            if not result_event.wait(timeout=180.0):
                self.get_logger().warn("Timeout Nav2. Goal annule.")
                goal_handle = result_state["goal_handle"]

                if goal_handle is not None:
                    try:
                        goal_handle.cancel_goal_async()
                    except Exception:
                        pass

                return False

            final_status = result_state["status"]
            final_label = self.goal_status_label(final_status)
            self.get_logger().info(f"Resultat Nav2 recu | status={final_label}")

            if final_status != GoalStatus.STATUS_SUCCEEDED:
                self.get_logger().warn(f"Goal Nav2 termine sans succes | status={final_label}")

            return final_status == GoalStatus.STATUS_SUCCEEDED
        except Exception as error:
            self.get_logger().error(f"Erreur navigation Nav2 : {error}")
            return False

    def execute_fake_action(self, poi, poi_index, total_pois):
        poi_name = str(poi.get("name", "POI_sans_nom"))

        self.get_logger().info(
            f"Debut action vide pour le POI #{poi_index + 1}/{total_pois} : {poi_name}"
        )
        self.publish_mission_log(
            "Action vide demarree",
            extra={"poiIndex": poi_index, "poiName": poi_name}
        )

        for counter in range(1, 11):
            self.get_logger().info(f"Action vide | POI {poi_name} | compteur {counter}/10")
            time.sleep(1)

        self.get_logger().info(f"Fin action vide pour le POI : {poi_name}")
        self.publish_mission_log(
            "Action vide terminee",
            extra={"poiIndex": poi_index, "poiName": poi_name}
        )

    def handle_save_map(self, payload):
        raw_map_name = payload.get("mapName", "")

        if not raw_map_name:
            raw_map_name = "map_" + datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

        safe_map_name = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_map_name)

        script_dir = os.path.dirname(os.path.abspath(__file__))
        maps_dir = os.path.join(script_dir, "maps")
        self.ensure_dir(maps_dir)

        base_name = safe_map_name
        counter = 1
        map_path = os.path.join(maps_dir, base_name)

        while os.path.exists(map_path + ".yaml"):
            base_name = f"{safe_map_name}_{counter}"
            map_path = os.path.join(maps_dir, base_name)
            counter += 1

        command = (
            ENV_PREFIX +
            " && ros2 run nav2_map_server map_saver_cli -f " +
            shlex.quote(map_path) +
            " --ros-args -p map_subscribe_transient_local:=true"
        )

        result = self.run_shell(command)

        if result.returncode != 0:
            self.get_logger().error(
                "Erreur map_saver_cli : " + result.stderr.decode("utf-8")
            )
            return

        self.get_logger().info(f"Carte brute sauvegardee sous : {map_path}")
        time.sleep(2)

        try:
            with open(map_path + ".pgm", "rb") as pgm_file:
                pgm_data = pgm_file.read()

            with open(map_path + ".yaml", "rb") as yaml_file:
                yaml_data = yaml_file.read()

            pgm_b64 = base64.b64encode(zlib.compress(pgm_data)).decode("utf-8")
            yaml_b64 = base64.b64encode(zlib.compress(yaml_data)).decode("utf-8")

            upload_payload = json.dumps({
                "mapName": base_name,
                "pgm": pgm_b64,
                "yaml": yaml_b64,
                "initialPose": self.slam_initial_pose
            })

            self.mqtt_client.publish(
                f"navbot/{ROBOT_ID}/map_upload",
                upload_payload,
                qos=1
            )
            self.get_logger().info("Carte compressee et envoyee au serveur via MQTT.")
        except Exception as error:
            self.get_logger().error(f"Erreur lors de la compression/envoi de la carte : {error}")

    def handle_system_command(self, payload):
        action = payload.get("action")
        self.get_logger().info(f"Commande systeme recue : {action}")

        if action == "start_slam":
            self.slam_initial_pose = None
            command = ENV_PREFIX + " && ros2 launch turtlebot4_navigation slam.launch.py sync:=false"
            self.run_shell_background(command, "/tmp/tb4_slam.log")
            self.get_logger().info("Process SLAM demarre localement.")
            self.schedule_slam_initial_pose_capture()

        elif action == "stop_slam":
            self.run_shell("pkill -f 'turtlebot4_navigation slam.launch.py'")
            self.run_shell("pkill -f slam_toolbox")
            self.get_logger().info("Process SLAM arrete.")

        elif action == "reset_slam":
            self.slam_initial_pose = None
            self.run_shell("pkill -f 'turtlebot4_navigation slam.launch.py'")
            self.run_shell("pkill -f slam_toolbox")
            self.get_logger().info("Arret du SLAM. Attente de 4 secondes pour liberer ROS 2...")
            time.sleep(4)
            command = ENV_PREFIX + " && ros2 launch turtlebot4_navigation slam.launch.py sync:=false"
            self.run_shell_background(command, "/tmp/tb4_slam.log")
            self.get_logger().info("Process SLAM redemarre.")
            self.schedule_slam_initial_pose_capture()

        elif action == "start_bridge":
            command = ENV_PREFIX + " && ros2 launch rosbridge_server rosbridge_websocket_launch.xml"
            self.run_shell_background(command, "/tmp/tb4_bridge.log")
            self.get_logger().info("Process rosbridge demarre.")

        elif action == "stop_bridge":
            self.run_shell("pkill -f 'rosbridge_websocket_launch.xml'")
            self.run_shell("pkill -f rosbridge_websocket")
            self.get_logger().info("Process rosbridge arrete.")

        elif action == "start_video_stream":
            if self.is_process_running("web_video_server"):
                self.get_logger().info("Process web_video_server deja actif.")
            else:
                command = (
                    ENV_PREFIX +
                    f" && ros2 run web_video_server web_video_server --ros-args -p port:={VIDEO_STREAM_PORT} -p address:=0.0.0.0"
                )
                self.run_shell_background(command, "/tmp/tb4_video_stream.log")
                self.get_logger().info(
                    f"Process web_video_server demarre sur le port {VIDEO_STREAM_PORT}."
                )

        elif action == "stop_video_stream":
            self.run_shell("pkill -f web_video_server")
            self.get_logger().info("Process web_video_server arrete.")

        elif action == "save_map":
            self.handle_save_map(payload)

    def execute_mission(self, payload):
        mission_id = str(payload.get("missionId", "mission_runtime"))
        plan_name = str(payload.get("planName", "unknown_plan"))

        self.get_logger().info(f"Mission recue pour le robot {ROBOT_ID}")
        self.get_logger().info(f"Mission ID : {mission_id}")
        self.get_logger().info(f"Plan : {plan_name}")

        self.publish_mission_log(
            "Mission recue",
            extra={"missionId": mission_id, "planName": plan_name}
        )

        try:
            runtime_map_info = self.save_runtime_map(payload.get("map", {}), mission_id)
        except Exception as error:
            self.get_logger().error(str(error))
            self.publish_mission_log("Map mission invalide", level="error")
            return

        metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
        initial_pose = metadata.get("initialPose") if isinstance(metadata, dict) else None
        force_restart_navigation = bool(metadata.get("forceRestartNavigation", False))

        pois = payload.get("pois", [])
        self.get_logger().info(f"Nombre de POI : {len(pois)}")

        for index, poi in enumerate(pois):
            self.get_logger().info(
                "POI #{0} | nom={1} | x={2} | y={3} | type={4}".format(
                    index + 1,
                    str(poi.get("name")),
                    str(poi.get("x")),
                    str(poi.get("y")),
                    str(poi.get("type"))
                )
            )

        if len(pois) == 0:
            self.get_logger().warn("Aucun POI dans la mission.")
            self.publish_mission_log("Mission vide", level="warn")
            return

        reuse_existing_navigation = False

        if not force_restart_navigation:
            reuse_existing_navigation = self.can_reuse_existing_navigation(runtime_map_info["map_name"])

        if reuse_existing_navigation:
            self.get_logger().info(
                f"Reutilisation de la stack navigation existante pour la map {runtime_map_info['map_name']}."
            )
            self.publish_mission_log(
                "Reutilisation navigation existante",
                extra={"mapName": runtime_map_info["map_name"]}
            )
        else:
            self.stop_navigation()
            localization_ok = self.ensure_localization(runtime_map_info["yaml_path"])

            if not localization_ok:
                self.get_logger().error("Localisation non disponible. Mission abandonnee.")
                self.publish_mission_log("Localisation indisponible", level="error")
                return

        if isinstance(initial_pose, dict):
            try:
                initial_x = float(initial_pose.get("x", 0.0))
                initial_y = float(initial_pose.get("y", 0.0))
                initial_yaw = float(initial_pose.get("yaw", 0.0))
                self.publish_initial_pose(initial_x, initial_y, initial_yaw)
                self.publish_mission_log(
                    "Pose initiale publiee",
                    extra={"x": initial_x, "y": initial_y, "yaw": initial_yaw}
                )
                if not self.wait_for_localization(timeout_seconds=20.0):
                    self.publish_mission_log("Localisation non stabilisee", level="error")
                    return
            except Exception as error:
                self.get_logger().warn(f"Erreur publication pose initiale : {error}")
                self.publish_mission_log("Erreur pose initiale", level="error")
                return
        else:
            self.get_logger().warn("Aucune pose initiale definie pour cette carte. Mission abandonnee.")
            self.publish_mission_log("Pose initiale manquante", level="error")
            return

        if not reuse_existing_navigation:
            nav2_ok = self.ensure_nav2_stack()

            if not nav2_ok:
                self.get_logger().error("Navigation non disponible. Mission abandonnee.")
                self.publish_mission_log("Navigation indisponible", level="error")
                return

        if not self.prepare_navigator():
            self.publish_mission_log("Navigation indisponible", level="error")
            return

        total_pois = len(pois)

        for poi_index, poi in enumerate(pois):
            poi_name = str(poi.get("name", "POI_sans_nom"))
            goal_x = float(poi.get("x", 0.0))
            goal_y = float(poi.get("y", 0.0))
            goal_yaw = float(poi.get("yaw", 0.0))

            self.get_logger().info(
                "Navigation vers le POI #{0}/{1} : {2}".format(
                    poi_index + 1, total_pois, poi_name
                )
            )
            self.publish_mission_log(
                "Navigation vers POI",
                extra={
                    "poiIndex": poi_index,
                    "poiName": poi_name,
                    "x": goal_x,
                    "y": goal_y,
                    "yaw": goal_yaw
                }
            )

            success = self.send_goal_to_nav2(goal_x, goal_y, goal_yaw)

            if not success:
                self.get_logger().warn(f"Echec ou timeout sur le POI : {poi_name}")
                self.publish_mission_log(
                    "Echec navigation POI",
                    level="warn",
                    extra={"poiIndex": poi_index, "poiName": poi_name}
                )
                return

            self.get_logger().info(f"POI atteint : {poi_name}")
            self.publish_mission_log(
                "POI atteint",
                extra={"poiIndex": poi_index, "poiName": poi_name}
            )

            self.execute_fake_action(poi, poi_index, total_pois)

        self.get_logger().info("Mission terminee avec succes.")
        self.publish_mission_log("Mission terminee", extra={"missionId": mission_id})

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.get_logger().info("Connecte au broker MQTT")
        else:
            self.get_logger().warn(f"Connexion MQTT echouee, code {rc}")
            return

        status_topic = f"navbot/{ROBOT_ID}/status"

        client.publish(status_topic, json.dumps({"state": "online"}), qos=1, retain=True)
        client.subscribe(f"navbot/{ROBOT_ID}/cmd_vel", qos=1)
        client.subscribe(f"navbot/{ROBOT_ID}/sys_cmd", qos=1)
        client.subscribe(f"navbot/{ROBOT_ID}/mission", qos=1)

        self.get_logger().info(f"Souscription aux topics du robot {ROBOT_ID}")

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            self.get_logger().warn(f"Deconnexion MQTT inattendue, code {rc}")
        else:
            self.get_logger().info("Deconnexion MQTT propre")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            topic = msg.topic

            if topic == f"navbot/{ROBOT_ID}/cmd_vel":
                twist = Twist()
                twist.linear.x = float(payload.get("linear", 0.0))
                twist.angular.z = float(payload.get("angular", 0.0))
                self.cmd_pub.publish(twist)
                self.get_logger().info(
                    f"cmd_vel recu | linear={twist.linear.x:.3f} angular={twist.angular.z:.3f}"
                )

            elif topic == f"navbot/{ROBOT_ID}/mission":
                mission_thread = threading.Thread(target=self.execute_mission, args=(payload,))
                mission_thread.daemon = True
                mission_thread.start()

            elif topic == f"navbot/{ROBOT_ID}/sys_cmd":
                self.handle_system_command(payload)

        except Exception as error:
            self.get_logger().error(f"Erreur traitement message MQTT: {error}")

    def on_battery(self, msg):
        now = time.time()

        if self.last_battery_publish_time and now - self.last_battery_publish_time < 3.0:
            return

        percent = None
        voltage = None

        if math.isfinite(msg.percentage):
            percent = float(msg.percentage)
            if percent <= 1.0:
                percent *= 100.0
            percent = max(0.0, min(100.0, percent))

        if math.isfinite(msg.voltage) and msg.voltage > 0.0:
            voltage = float(msg.voltage)

        if percent is None and voltage is None:
            return

        self.publish_battery_telemetry(voltage=voltage, percentage=percent)
        self.last_battery_publish_time = now

    def on_odom(self, msg):
        try:
            transform = TransformStamped()
            transform.header.stamp = msg.header.stamp
            transform.header.frame_id = msg.header.frame_id or "odom"
            transform.child_frame_id = msg.child_frame_id or "base_link"
            transform.transform.translation.x = msg.pose.pose.position.x
            transform.transform.translation.y = msg.pose.pose.position.y
            transform.transform.translation.z = msg.pose.pose.position.z
            transform.transform.rotation = msg.pose.pose.orientation

            self.tf_broadcaster.sendTransform(transform)
            self.last_odom_publish_time = time.time()
        except Exception as error:
            self.get_logger().warn(f"Erreur republish TF odom: {error}")

    def on_amcl_pose(self, msg):
        self.last_amcl_pose_time = time.time()

    def destroy_node(self):
        try:
            status_topic = f"navbot/{ROBOT_ID}/status"
            self.mqtt_client.publish(status_topic, json.dumps({"state": "offline"}), qos=1, retain=True)
            self.mqtt_client.disconnect()
            self.mqtt_client.loop_stop()
        except Exception:
            pass

        super().destroy_node()


def main():
    rclpy.init()
    node = MqttCmdVelBridge()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info("Arret du bridge MQTT cmd_vel")
    finally:
        node.destroy_node()
        try:
            if rclpy.ok():
                rclpy.shutdown()
        except Exception:
            pass


if __name__ == "__main__":
    main()
