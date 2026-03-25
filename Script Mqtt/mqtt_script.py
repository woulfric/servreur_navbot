#!/usr/bin/env python3
import json
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import paho.mqtt.client as mqtt

MQTT_BROKER = "138.68.110.228"
MQTT_PORT = 1883
MQTT_USERNAME = "navbot"
MQTT_PASSWORD = "turtlebot"

ROBOT_ID = "tb4_01"


class MqttCmdVelBridge(Node):
    def __init__(self):
        super().__init__("mqtt_cmdvel_bridge_tb4")

        self.cmd_pub = self.create_publisher(Twist, "/cmd_vel", 10)

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

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.get_logger().info("Connecte au broker MQTT")
        else:
            self.get_logger().warn(f"Connexion MQTT echouee, code {rc}")
            return

        status_topic = f"navbot/{ROBOT_ID}/status"
        cmd_topic = f"navbot/{ROBOT_ID}/cmd_vel"

        client.publish(status_topic, json.dumps({"state": "online"}), qos=1, retain=True)
        client.subscribe(cmd_topic, qos=1)

        self.get_logger().info(f"Souscrit a {cmd_topic}")

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            self.get_logger().warn(f"Deconnexion MQTT inattendue, code {rc}")
        else:
            self.get_logger().info("Deconnexion MQTT propre")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))

            twist = Twist()
            twist.linear.x = float(payload.get("linear", 0.0))
            twist.angular.z = float(payload.get("angular", 0.0))

            self.cmd_pub.publish(twist)

            self.get_logger().info(
                f"cmd_vel recu | linear={twist.linear.x:.3f} angular={twist.angular.z:.3f}"
            )
        except Exception as e:
            self.get_logger().error(f"Erreur traitement message MQTT: {e}")

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
        rclpy.shutdown()


if __name__ == "__main__":
    main()
