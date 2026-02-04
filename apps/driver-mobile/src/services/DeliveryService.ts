import {store} from '@/store';
import {
  setAssignedParcels,
  addAssignedParcel,
  updateParcelStatus,
  completeDelivery,
  failDelivery,
  setLoading,
  setError,
} from '@/store/slices/deliverySlice';
import {addPendingAction} from '@/store/slices/offlineSlice';
import {LocationService} from './LocationService';

interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

interface Parcel {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  pickupAddress: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  slaDeadline: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  specialInstructions?: string;
  proofOfDelivery?: {
    signature?: string;
    photo?: string;
    timestamp: string;
    location: GeoCoordinate;
  };
}

interface DeliveryCompletionData {
  parcelId: string;
  signature?: string;
  photo?: string;
  recipientName?: string;
  notes?: string;
}

interface DeliveryFailureData {
  parcelId: string;
  reason: string;
  notes?: string;
  attemptedAt: string;
}

export class DeliveryService {
  private static instance: DeliveryService;
  private locationService: LocationService;

  constructor() {
    this.locationService = LocationService.getInstance();
  }

  public static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  public async fetchAssignedParcels(): Promise<void> {
    try {
      store.dispatch(setLoading(true));
      
      const state = store.getState();
      const {token, user} = state.auth;
      const {isOnline} = state.offline;

      if (!isOnline || !token || !user?.vehicleId) {
        // Use cached parcels if offline
        store.dispatch(setLoading(false));
        return;
      }

      const response = await fetch(
        `${process.env.API_BASE_URL}/api/vehicles/${user.vehicleId}/parcels`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parcels: Parcel[] = data.parcels || [];

      store.dispatch(setAssignedParcels(parcels));
      store.dispatch(setLoading(false));
    } catch (error) {
      console.error('Error fetching assigned parcels:', error);
      store.dispatch(setError('Failed to fetch assigned parcels'));
      store.dispatch(setLoading(false));
    }
  }

  public async updateParcelStatus(parcelId: string, status: Parcel['status']): Promise<void> {
    try {
      const state = store.getState();
      const {token} = state.auth;
      const {isOnline} = state.offline;

      // Update local state immediately
      store.dispatch(updateParcelStatus({parcelId, status}));

      const updateData = {
        parcelId,
        status,
        timestamp: new Date().toISOString(),
        location: await this.getCurrentLocation(),
      };

      if (!isOnline || !token) {
        // Queue for offline sync
        store.dispatch(addPendingAction({
          type: 'status_update',
          payload: updateData,
        }));
        return;
      }

      // Send to server
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/parcels/${parcelId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Parcel status updated successfully');
    } catch (error) {
      console.error('Error updating parcel status:', error);
      
      // Queue for offline sync
      const updateData = {
        parcelId,
        status,
        timestamp: new Date().toISOString(),
        location: await this.getCurrentLocation(),
      };

      store.dispatch(addPendingAction({
        type: 'status_update',
        payload: updateData,
      }));
    }
  }

  public async completeDelivery(completionData: DeliveryCompletionData): Promise<void> {
    try {
      const currentLocation = await this.getCurrentLocation();
      
      if (!currentLocation) {
        throw new Error('Unable to get current location for delivery completion');
      }

      const proofOfDelivery = {
        signature: completionData.signature,
        photo: completionData.photo,
        timestamp: new Date().toISOString(),
        location: currentLocation,
        recipientName: completionData.recipientName,
        notes: completionData.notes,
      };

      // Update local state
      store.dispatch(completeDelivery({
        parcelId: completionData.parcelId,
        proofOfDelivery,
      }));

      // Trigger capacity update
      await this.updateVehicleCapacity(completionData.parcelId, 'delivered');

      const state = store.getState();
      const {token} = state.auth;
      const {isOnline} = state.offline;

      const deliveryData = {
        parcelId: completionData.parcelId,
        status: 'delivered',
        proofOfDelivery,
        completedAt: new Date().toISOString(),
      };

      if (!isOnline || !token) {
        // Queue for offline sync
        store.dispatch(addPendingAction({
          type: 'delivery_complete',
          payload: deliveryData,
        }));
        return;
      }

      // Send to server
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/parcels/${completionData.parcelId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deliveryData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Delivery completed successfully');
    } catch (error) {
      console.error('Error completing delivery:', error);
      store.dispatch(setError('Failed to complete delivery'));
      
      // Still queue for offline sync
      const currentLocation = await this.getCurrentLocation();
      if (currentLocation) {
        const deliveryData = {
          parcelId: completionData.parcelId,
          status: 'delivered',
          proofOfDelivery: {
            signature: completionData.signature,
            photo: completionData.photo,
            timestamp: new Date().toISOString(),
            location: currentLocation,
            recipientName: completionData.recipientName,
            notes: completionData.notes,
          },
          completedAt: new Date().toISOString(),
        };

        store.dispatch(addPendingAction({
          type: 'delivery_complete',
          payload: deliveryData,
        }));
      }
    }
  }

  public async failDelivery(failureData: DeliveryFailureData): Promise<void> {
    try {
      const currentLocation = await this.getCurrentLocation();

      // Update local state
      store.dispatch(failDelivery({
        parcelId: failureData.parcelId,
        reason: failureData.reason,
      }));

      const state = store.getState();
      const {token} = state.auth;
      const {isOnline} = state.offline;

      const failurePayload = {
        parcelId: failureData.parcelId,
        status: 'failed',
        reason: failureData.reason,
        notes: failureData.notes,
        attemptedAt: failureData.attemptedAt,
        location: currentLocation,
      };

      if (!isOnline || !token) {
        // Queue for offline sync
        store.dispatch(addPendingAction({
          type: 'delivery_failure',
          payload: failurePayload,
        }));
        return;
      }

      // Send to server
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/parcels/${failureData.parcelId}/fail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(failurePayload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Delivery failure recorded successfully');
    } catch (error) {
      console.error('Error recording delivery failure:', error);
      store.dispatch(setError('Failed to record delivery failure'));
      
      // Still queue for offline sync
      const currentLocation = await this.getCurrentLocation();
      const failurePayload = {
        parcelId: failureData.parcelId,
        status: 'failed',
        reason: failureData.reason,
        notes: failureData.notes,
        attemptedAt: failureData.attemptedAt,
        location: currentLocation,
      };

      store.dispatch(addPendingAction({
        type: 'delivery_failure',
        payload: failurePayload,
      }));
    }
  }

  public async pickupParcel(parcelId: string): Promise<void> {
    try {
      await this.updateParcelStatus(parcelId, 'picked_up');
      
      // Trigger capacity update
      await this.updateVehicleCapacity(parcelId, 'picked_up');
      
      console.log('Parcel picked up successfully');
    } catch (error) {
      console.error('Error picking up parcel:', error);
      store.dispatch(setError('Failed to record parcel pickup'));
    }
  }

  private async updateVehicleCapacity(parcelId: string, action: 'picked_up' | 'delivered'): Promise<void> {
    try {
      const state = store.getState();
      const {token, user} = state.auth;
      const {isOnline} = state.offline;

      if (!user?.vehicleId) {
        return;
      }

      const capacityUpdate = {
        vehicleId: user.vehicleId,
        parcelId,
        action,
        timestamp: new Date().toISOString(),
      };

      if (!isOnline || !token) {
        // Queue for offline sync
        store.dispatch(addPendingAction({
          type: 'capacity_update',
          payload: capacityUpdate,
        }));
        return;
      }

      // Send to server
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/vehicles/${user.vehicleId}/capacity`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(capacityUpdate),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Vehicle capacity updated successfully');
    } catch (error) {
      console.error('Error updating vehicle capacity:', error);
      
      // Queue for offline sync
      const state = store.getState();
      const {user} = state.auth;
      
      if (user?.vehicleId) {
        const capacityUpdate = {
          vehicleId: user.vehicleId,
          parcelId,
          action,
          timestamp: new Date().toISOString(),
        };

        store.dispatch(addPendingAction({
          type: 'capacity_update',
          payload: capacityUpdate,
        }));
      }
    }
  }

  private async getCurrentLocation(): Promise<GeoCoordinate | null> {
    try {
      return await this.locationService.getCurrentLocation();
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  public async handleNewParcelAssignment(parcel: Parcel): Promise<void> {
    try {
      // Add to local state
      store.dispatch(addAssignedParcel(parcel));
      
      // Update route if needed
      const {RouteService} = await import('./RouteService');
      const routeService = RouteService.getInstance();
      
      await routeService.addNewParcelToRoute({
        id: parcel.id,
        pickupAddress: parcel.pickupAddress,
        pickupLocation: await this.geocodeAddress(parcel.pickupAddress),
        deliveryAddress: parcel.deliveryAddress,
        deliveryLocation: await this.geocodeAddress(parcel.deliveryAddress),
        estimatedPickupTime: new Date().toISOString(),
        estimatedDeliveryTime: parcel.slaDeadline,
      });
      
      console.log('New parcel assignment handled successfully');
    } catch (error) {
      console.error('Error handling new parcel assignment:', error);
    }
  }

  private async geocodeAddress(address: string): Promise<GeoCoordinate> {
    try {
      const {GoogleMapsService} = await import('./GoogleMapsService');
      const googleMapsService = GoogleMapsService.getInstance();
      
      const location = await googleMapsService.geocodeAddress(address);
      return location || {latitude: 0, longitude: 0};
    } catch (error) {
      console.error('Error geocoding address:', error);
      return {latitude: 0, longitude: 0};
    }
  }

  public getParcelById(parcelId: string): Parcel | null {
    const state = store.getState();
    const {assignedParcels, completedDeliveries} = state.delivery;
    
    return [...assignedParcels, ...completedDeliveries].find(p => p.id === parcelId) || null;
  }

  public getPendingDeliveries(): Parcel[] {
    const state = store.getState();
    const {assignedParcels} = state.delivery;
    
    return assignedParcels.filter(p => p.status !== 'delivered' && p.status !== 'failed');
  }

  public getCompletedDeliveries(): Parcel[] {
    const state = store.getState();
    const {completedDeliveries} = state.delivery;
    
    return completedDeliveries;
  }
}