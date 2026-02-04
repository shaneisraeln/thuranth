import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { updateVehicleRealtime } from '../store/slices/vehicleSlice';
import { updateParcelRealtime, sortPendingParcelsByPriority } from '../store/slices/parcelSlice';
import { addDecisionRealtime } from '../store/slices/decisionSlice';
import { updateMetricsRealtime } from '../store/slices/metricsSlice';
import { addNotification } from '../store/slices/uiSlice';
import websocketService from '../services/websocket';

const RealTimeUpdates: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Vehicle location updates
    websocketService.onVehicleLocationUpdate((data) => {
      // Update vehicle location in real-time
      dispatch(updateVehicleRealtime({
        id: data.vehicleId,
        currentLocation: data.location,
        lastUpdated: new Date(),
      } as any));
    });

    // Parcel assignment updates
    websocketService.onParcelAssigned((data) => {
      dispatch(addNotification({
        type: 'success',
        message: `Parcel ${data.parcelId} assigned to vehicle ${data.vehicleId}`,
      }));
      
      // Re-sort parcel queue after assignment
      dispatch(sortPendingParcelsByPriority());
    });

    // Decision overrides
    websocketService.onDecisionOverridden((data) => {
      dispatch(addNotification({
        type: 'warning',
        message: `Decision ${data.decisionId} was manually overridden: ${data.reason}`,
      }));
    });

    // Cleanup listeners on unmount
    return () => {
      websocketService.off('vehicle:location');
      websocketService.off('parcel:assigned');
      websocketService.off('decision:overridden');
    };
  }, [dispatch]);

  // This component doesn't render anything, it just manages real-time updates
  return null;
};

export default RealTimeUpdates;