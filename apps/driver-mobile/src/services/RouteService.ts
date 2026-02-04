import {store} from '@/store';
import {
  setCurrentRoute,
  setOptimizedRoute,
  addRoutePoint,
  removeRoutePoint,
  updateRouteMetrics,
  setLoading,
  setError,
} from '@/store/slices/routeSlice';
import {addPendingAction} from '@/store/slices/offlineSlice';
import {GoogleMapsService} from './GoogleMapsService';

interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

interface RoutePoint {
  id: string;
  parcelId: string;
  address: string;
  location: GeoCoordinate;
  type: 'pickup' | 'delivery';
  estimatedTime: string;
  completed: boolean;
  sequence: number;
}

interface RouteUpdatePayload {
  routePoints: RoutePoint[];
  vehicleId: string;
}

export class RouteService {
  private static instance: RouteService;
  private googleMapsService: GoogleMapsService;

  constructor() {
    this.googleMapsService = GoogleMapsService.getInstance();
  }

  public static getInstance(): RouteService {
    if (!RouteService.instance) {
      RouteService.instance = new RouteService();
    }
    return RouteService.instance;
  }

  public async fetchCurrentRoute(): Promise<void> {
    try {
      store.dispatch(setLoading(true));
      
      const state = store.getState();
      const {token, user} = state.auth;
      const {isOnline} = state.offline;

      if (!isOnline || !token || !user?.vehicleId) {
        // Use cached route if offline
        store.dispatch(setLoading(false));
        return;
      }

      const response = await fetch(
        `${process.env.API_BASE_URL}/api/vehicles/${user.vehicleId}/route`,
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
      const routePoints: RoutePoint[] = data.routePoints || [];

      store.dispatch(setCurrentRoute(routePoints));
      
      // Optimize route if there are pending points
      await this.optimizeCurrentRoute();
      
      store.dispatch(setLoading(false));
    } catch (error) {
      console.error('Error fetching current route:', error);
      store.dispatch(setError('Failed to fetch route'));
      store.dispatch(setLoading(false));
    }
  }

  public async optimizeCurrentRoute(): Promise<void> {
    try {
      const state = store.getState();
      const {currentRoute} = state.route;
      const {currentLocation} = state.location;

      if (!currentLocation || currentRoute.length === 0) {
        return;
      }

      const optimizedRoute = await this.googleMapsService.optimizeRoute(
        currentLocation,
        currentRoute
      );

      store.dispatch(setOptimizedRoute(optimizedRoute));
      
      // Calculate route metrics
      await this.calculateRouteMetrics(optimizedRoute);
    } catch (error) {
      console.error('Error optimizing route:', error);
      store.dispatch(setError('Failed to optimize route'));
    }
  }

  public async addNewParcelToRoute(parcel: {
    id: string;
    pickupAddress: string;
    pickupLocation: GeoCoordinate;
    deliveryAddress: string;
    deliveryLocation: GeoCoordinate;
    estimatedPickupTime: string;
    estimatedDeliveryTime: string;
  }): Promise<void> {
    try {
      // Create pickup point
      const pickupPoint: RoutePoint = {
        id: `pickup_${parcel.id}`,
        parcelId: parcel.id,
        address: parcel.pickupAddress,
        location: parcel.pickupLocation,
        type: 'pickup',
        estimatedTime: parcel.estimatedPickupTime,
        completed: false,
        sequence: 0, // Will be updated during optimization
      };

      // Create delivery point
      const deliveryPoint: RoutePoint = {
        id: `delivery_${parcel.id}`,
        parcelId: parcel.id,
        address: parcel.deliveryAddress,
        location: parcel.deliveryLocation,
        type: 'delivery',
        estimatedTime: parcel.estimatedDeliveryTime,
        completed: false,
        sequence: 0, // Will be updated during optimization
      };

      // Add points to route
      store.dispatch(addRoutePoint(pickupPoint));
      store.dispatch(addRoutePoint(deliveryPoint));

      // Re-optimize route
      await this.optimizeCurrentRoute();

      // Send update to server
      await this.syncRouteWithServer();
    } catch (error) {
      console.error('Error adding parcel to route:', error);
      store.dispatch(setError('Failed to add parcel to route'));
    }
  }

  public async removeParcelFromRoute(parcelId: string): Promise<void> {
    try {
      // Remove both pickup and delivery points
      store.dispatch(removeRoutePoint(`pickup_${parcelId}`));
      store.dispatch(removeRoutePoint(`delivery_${parcelId}`));

      // Re-optimize route
      await this.optimizeCurrentRoute();

      // Send update to server
      await this.syncRouteWithServer();
    } catch (error) {
      console.error('Error removing parcel from route:', error);
      store.dispatch(setError('Failed to remove parcel from route'));
    }
  }

  public async calculateETA(destination: GeoCoordinate): Promise<{
    duration: number;
    distance: number;
  } | null> {
    try {
      const state = store.getState();
      const {currentLocation} = state.location;

      if (!currentLocation) {
        return null;
      }

      return await this.googleMapsService.calculateETA(currentLocation, destination);
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  public async getNavigationDirections(destination: GeoCoordinate): Promise<any> {
    try {
      const state = store.getState();
      const {currentLocation} = state.location;

      if (!currentLocation) {
        throw new Error('Current location not available');
      }

      return await this.googleMapsService.getDirections(currentLocation, destination);
    } catch (error) {
      console.error('Error getting navigation directions:', error);
      throw error;
    }
  }

  private async calculateRouteMetrics(routePoints: RoutePoint[]): Promise<void> {
    try {
      const state = store.getState();
      const {currentLocation} = state.location;

      if (!currentLocation || routePoints.length === 0) {
        return;
      }

      let totalDistance = 0;
      let totalDuration = 0;
      let currentPos = currentLocation;

      // Calculate metrics for pending route points
      const pendingPoints = routePoints.filter(point => !point.completed);

      for (const point of pendingPoints) {
        const eta = await this.googleMapsService.calculateETA(currentPos, point.location);
        
        if (eta) {
          totalDistance += eta.distance;
          totalDuration += eta.duration;
          currentPos = point.location;
        }
      }

      store.dispatch(updateRouteMetrics({
        distance: totalDistance,
        duration: totalDuration,
      }));
    } catch (error) {
      console.error('Error calculating route metrics:', error);
    }
  }

  private async syncRouteWithServer(): Promise<void> {
    try {
      const state = store.getState();
      const {token, user} = state.auth;
      const {isOnline} = state.offline;
      const {currentRoute} = state.route;

      if (!token || !user?.vehicleId) {
        return;
      }

      const payload: RouteUpdatePayload = {
        routePoints: currentRoute,
        vehicleId: user.vehicleId,
      };

      if (!isOnline) {
        // Queue for offline sync
        store.dispatch(addPendingAction({
          type: 'route_update',
          payload,
        }));
        return;
      }

      const response = await fetch(
        `${process.env.API_BASE_URL}/api/vehicles/${user.vehicleId}/route`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Route synced with server successfully');
    } catch (error) {
      console.error('Error syncing route with server:', error);
      
      // Queue for offline sync
      const state = store.getState();
      const {user} = state.auth;
      const {currentRoute} = state.route;
      
      if (user?.vehicleId) {
        store.dispatch(addPendingAction({
          type: 'route_update',
          payload: {
            routePoints: currentRoute,
            vehicleId: user.vehicleId,
          },
        }));
      }
    }
  }

  public async handleRouteUpdate(updateData: any): Promise<void> {
    try {
      // Handle real-time route updates from server
      const {routePoints, type} = updateData;

      switch (type) {
        case 'new_parcel_assigned':
          await this.addNewParcelToRoute(updateData.parcel);
          break;
        case 'parcel_removed':
          await this.removeParcelFromRoute(updateData.parcelId);
          break;
        case 'route_optimized':
          store.dispatch(setCurrentRoute(routePoints));
          await this.optimizeCurrentRoute();
          break;
        default:
          console.log('Unknown route update type:', type);
      }
    } catch (error) {
      console.error('Error handling route update:', error);
    }
  }
}