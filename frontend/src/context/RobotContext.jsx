import React, { createContext, useEffect, useMemo, useState } from 'react';

export const RobotContext = createContext();
const SELECTED_ROBOT_STORAGE_KEY = 'navbot.selectedRobotId';

const readStoredSelectedRobotId = () => {
  try {
    const storedRobotId = localStorage.getItem(SELECTED_ROBOT_STORAGE_KEY);
    return storedRobotId || null;
  } catch (error) {
    console.warn('Impossible de lire le robot selectionne depuis le stockage local.', error);
    return null;
  }
};

export const RobotProvider = ({ children }) => {
  const [robots, setRobots] = useState([]);
  const [selectedRobotId, setSelectedRobotId] = useState(readStoredSelectedRobotId);

  const fetchRobots = async () => {
    try {
      const response = await fetch('/api/robots');
      const data = await response.json();

      if (data.status === 'success') {
        const nextRobots = Array.isArray(data.robots) ? data.robots : [];
        setRobots(nextRobots);

        setSelectedRobotId((prevSelectedRobotId) => {
          if (!prevSelectedRobotId) {
            return null;
          }

          const stillExists = nextRobots.some((robot) => robot.id === prevSelectedRobotId);
          return stillExists ? prevSelectedRobotId : null;
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recuperation des robots', error);
    }
  };

  useEffect(() => {
    fetchRobots();
    const interval = setInterval(fetchRobots, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      if (selectedRobotId) {
        localStorage.setItem(SELECTED_ROBOT_STORAGE_KEY, selectedRobotId);
      } else {
        localStorage.removeItem(SELECTED_ROBOT_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Impossible de sauvegarder le robot selectionne dans le stockage local.', error);
    }
  }, [selectedRobotId]);

  const activeRobots = useMemo(() => {
    return robots.filter((robot) => robot.status === 'online');
  }, [robots]);

  const value = {
    robots,
    activeRobots,
    selectedRobotId,
    setSelectedRobotId,
    isRobotOnline: activeRobots.some((r) => r.id === selectedRobotId),
  };

  return (
    <RobotContext.Provider value={value}>
      {children}
    </RobotContext.Provider>
  );
};
