import React, { createContext, useState, useEffect } from 'react';

export const RobotContext = createContext();

export const RobotProvider = ({ children }) => {
  const [activeRobots, setActiveRobots] = useState([]);
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  // Fonction pour recuperer la liste des robots depuis le backend Node.js
  const fetchActiveRobots = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/active');
      const data = await response.json();
      if (data.status === 'success') {
        setActiveRobots(data.robots);
        
        // Optionnel : auto-selectionner le premier robot s'il y en a un et qu'aucun n'est selectionne
        if (data.robots.length > 0 && !selectedRobotId) {
          setSelectedRobotId(data.robots[0].id);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recuperation des robots', error);
    }
  };

  useEffect(() => {
    fetchActiveRobots();
    // Polling toutes les 3 secondes pour garder la liste a jour
    const interval = setInterval(fetchActiveRobots, 3000);
    return () => clearInterval(interval);
  }, []);

  // Valeurs disponibles pour toutes les pages de l'application
  const value = {
    activeRobots,
    selectedRobotId,
    setSelectedRobotId,
    // Helper pour savoir si le robot selectionne est actuellement en ligne
    isRobotOnline: activeRobots.some(r => r.id === selectedRobotId)
  };

  return (
    <RobotContext.Provider value={value}>
      {children}
    </RobotContext.Provider>
  );
};