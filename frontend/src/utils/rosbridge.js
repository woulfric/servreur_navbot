const FALLBACK_ROSBRIDGE_URL = 'wss://ros.navbot.dev';

export async function getRosbridgeUrl() {
  try {
    const response = await fetch('/api/config');

    if (!response.ok) {
      throw new Error('Impossible de recuperer la configuration ROS');
    }

    const config = await response.json();
    const rosbridgeUrl = String(config?.ROSBRIDGE_URL || '').trim();

    if (rosbridgeUrl) {
      return rosbridgeUrl;
    }
  } catch (error) {
    console.error('Erreur config rosbridge:', error);
  }

  return FALLBACK_ROSBRIDGE_URL;
}
