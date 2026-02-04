import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationContainer from './NotificationContainer';
import ManualOverrideModal from './ManualOverrideModal';
import DecisionModal from './DecisionModal';
import websocketService from '../services/websocket';
import { updateVehicleRealtime } from '../store/slices/vehicleSlice';
import { updateParcelRealtime } from '../store/slices/parcelSlice';
import { addDecisionRealtime } from '../store/slices/decisionSlice';
import { updateMetricsRealtime } from '../store/slices/metricsSlice';
import { addNotification } from '../store/slices/uiSlice';
import { AppDispatch } from '../store';

const Layout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize WebSocket connection
    websocketService.connect();

    // Set up real-time event listeners
    websocketService.onVehicleUpdate((vehicle) => {
      dispatch(updateVehicleRealtime(vehicle));
    });

    websocketService.onParcelUpdate((parcel) => {
      dispatch(updateParcelRealtime(parcel));
    });

    websocketService.onDecisionMade((decision) => {
      dispatch(addDecisionRealtime(decision));
    });

    websocketService.onMetricsUpdate((metrics) => {
      dispatch(updateMetricsRealtime(metrics));
    });

    websocketService.onSLAAlert((alert) => {
      dispatch(addNotification({
        type: 'warning',
        message: `SLA Alert: ${alert.message} (Parcel: ${alert.parcelId})`,
      }));
    });

    websocketService.onSystemAlert((alert) => {
      dispatch(addNotification({
        type: alert.severity,
        message: alert.message,
      }));
    });

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <NotificationContainer />
      <ManualOverrideModal />
      <DecisionModal />
    </div>
  );
};

export default Layout;