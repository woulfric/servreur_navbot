import React, { createContext, useState, useEffect } from 'react';

export const RobotContext = createContext();

export const RobotProvider = ({ children }) => {
  const [activeRobots, setActiveRobots] = useState([]);
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  const fetchActiveRobots = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/active');
      const data = await response.json();

      if (data.status === 'success') {
        const robots = Array.isArray(data.robots) ? data.robots : [];
        setActiveRobots(robots);

        setSelectedRobotId((prevSelectedRobotId) => {
          if (!prevSelectedRobotId) {
            return null;
          }

          const stillExists = robots.some((robot) => robot.id === prevSelectedRobotId);
          return stillExists ? prevSelectedRobotId : null;
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recuperation des robots', error);
    }
  };

  useEffect(() => {
    fetchActiveRobots();
    const interval = setInterval(fetchActiveRobots, 3000);
    return () => clearInterval(interval);
  }, []);

  const value = {
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