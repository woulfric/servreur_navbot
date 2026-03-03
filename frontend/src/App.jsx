import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
//import { useAuthStore } from './store/auth.store';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard.jsx';
import Robots from './pages/Robots';
import Maps from './pages/Maps';
import Missions from './pages/Missions';
import POI from './pages/POI';
import Alerts from './pages/Alerts';
import History from './pages/History';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Telecommande from './pages/Telecommande';
import MapView from './pages/MapView';


export default function App() {
  const isAuthenticated = true; // remplacer par useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" /> : <Login />
          }
        />

        {/* Protected */}
        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/robots"
          element={isAuthenticated ? <Robots /> : <Navigate to="/login" />}
        />
        <Route
          path="/maps"
          element={isAuthenticated ? <Maps /> : <Navigate to="/login" />}
        />
        <Route
          path="/missions"
          element={isAuthenticated ? <Missions /> : <Navigate to="/login" />}
        />
        <Route
          path="/poi"
          element={isAuthenticated ? <POI /> : <Navigate to="/login" />}
        />
        <Route
          path="/alerts"
          element={isAuthenticated ? <Alerts /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={isAuthenticated ? <History /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        />
        <Route 
        path="mapview" 
        element={isAuthenticated ? <MapView /> : <Navigate to="/login" />} 
        />  

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      
                
    
        <Route path="teleop" element={<Telecommande />} />

      </Routes>
    </BrowserRouter>
  );
}
