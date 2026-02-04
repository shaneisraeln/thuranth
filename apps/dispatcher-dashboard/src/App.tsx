import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import VehicleManagement from './pages/VehicleManagement';
import ParcelManagement from './pages/ParcelManagement';
import DecisionHistory from './pages/DecisionHistory';
import Analytics from './pages/Analytics';
import './styles/globals.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vehicles" element={<VehicleManagement />} />
              <Route path="parcels" element={<ParcelManagement />} />
              <Route path="decisions" element={<DecisionHistory />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;