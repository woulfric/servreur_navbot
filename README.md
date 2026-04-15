# NavBot

NavBot est une plateforme de supervision, cartographie et contrôle de robots mobiles TurtleBot.  
Le projet repose sur :

- un backend Node.js / Express ;
- un frontend web React / Vite ;
- une base MongoDB ;
- des scripts Python côté robot pour relier MQTT et ROS.

## Structure du projet

- `src/` : backend API et logique métier
- `frontend/` : interface web officielle
- `Script Mqtt/` : scripts Python côté robot
- `public/maps/` : cartes enregistrées (`.pgm` / `.yaml`)
- `public/POIMaps/` : plans de mission / POI (`.json`)

## Pré-requis

Avant de lancer le projet, il faut disposer de :

- `Node.js` et `npm`
- `MongoDB`
- `Python 3`
- un environnement ROS configuré sur le robot :
  - TurtleBot3 : ROS 1 Noetic
  - TurtleBot4 : ROS 2 Humble
- la bibliothèque Python `paho-mqtt`

## Installation

### Backend

À la racine du dépôt :

```bash
npm install
```

### Frontend

Dans le dossier `frontend/` :

```bash
cd frontend
npm install
cd ..
```

### Côté robot

Utiliser le script adapté au robot :

- TurtleBot3 : `Script Mqtt/mqtt_ros_bridge.py`
- TurtleBot4 : `Script Mqtt/mqtt_script.py`

Le script doit être présent sur la machine robot ou accessible depuis l’environnement de lancement.

## Lancement du projet

### 1. Démarrer MongoDB

S’assurer que MongoDB est bien lancé sur la machine serveur.

### 2. Lancer le backend

À la racine du dépôt :

```bash
npm run dev
```

Le backend démarre par défaut sur le port `3000`.

### 3. Lancer le frontend

Dans `frontend/` :

```bash
cd frontend
npm run dev
```

Le frontend sera accessible via Vite en local.

### 4. Lancer le robot

#### TurtleBot4

Après avoir chargé l’environnement ROS 2 :

```bash
source /opt/ros/humble/setup.bash
source ~/turtlebot4_ws/install/setup.bash
python3 "Script Mqtt/mqtt_script.py"
```

#### TurtleBot3

Après avoir chargé l’environnement ROS 1 :

```bash
source /opt/ros/noetic/setup.bash
source ~/catkin_ws/devel/setup.bash
export TURTLEBOT3_MODEL=burger
roslaunch turtlebot3_bringup turtlebot3_robot.launch
python3 "Script Mqtt/mqtt_ros_bridge.py"
```

## Remarques

- le frontend officiel du projet est dans `frontend/`
- le dossier `public/` sert principalement à exposer les cartes et les plans de mission
- la communication avec les robots passe principalement par MQTT
- certaines fonctionnalités dépendent du bon démarrage des services ROS sur le robot

