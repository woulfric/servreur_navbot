import React, { createContext, useEffect, useMemo, useState } from 'react';

export const RobotContext = createContext();

export const RobotProvider = ({ children }) => {
  const [robots, setRobots] = useState([]);
  const [selectedRobotId, setSelectedRobotId] = useState(null);

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
