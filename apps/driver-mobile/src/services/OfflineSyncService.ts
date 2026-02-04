import NetInfo from '@react-native-netinfo';
import {store} from '@/store';
import {
  setOnlineStatus,
  startSync,
  syncSuccess,
  syncFailure,
  incrementRetryCount,
  removePendingAction,
} from '@/store/slices/offlineSlice';

interface OfflineAction {
  id: string;
  type: 'delivery_complete' | 'status_update' | 'location_update' | 'pickup_complete' | 'capacity_update' | 'route_update' | 'delivery_failure';
  payload: any;
  timestamp: string;
  retryCount: number;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private syncIntervalMs = 30000; // 30 seconds

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = OfflineSyncService.getInstance();
    await instance.setupNetworkListener();
    instance.startPeriodicSync();
  }

  private async setupNetworkListener(): Promise<void> {
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      store.dispatch(setOnlineStatus(isOnline || false));
      
      if (isOnline) {
        console.log('Network connected - starting sync');
        this.syncPendingActions();
      } else {
        console.log('Network disconnected - entering offline mode');
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected && state.isInternetReachable;
    store.dispatch(setOnlineStatus(isOnline || false));
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      const state = store.getState();
      if (state.offline.isOnline && state.offline.pendingActions.length > 0) {
        this.syncPendingActions();
      }
    }, this.syncIntervalMs);
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public async syncPendingActions(): Promise<void> {
    const state = store.getState();
    const {pendingActions, isOnline, syncInProgress} = state.offline;

    if (!isOnline || syncInProgress || pendingActions.length === 0) {
      return;
    }

    store.dispatch(startSync());

    const syncedActionIds: string[] = [];
    const failedActionIds: string[] = [];

    for (const action of pendingActions) {
      try {
        const success = await this.syncAction(action);
        
        if (success) {
          syncedActionIds.push(action.id);
        } else {
          failedActionIds.push(action.id);
          
          // Increment retry count
          store.dispatch(incrementRetryCount(action.id));
          
          // Remove action if max retries exceeded
          if (action.retryCount >= this.maxRetries) {
            console.warn(`Max retries exceeded for action ${action.id}, removing from queue`);
            store.dispatch(removePendingAction(action.id));
          }
        }
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        failedActionIds.push(action.id);
        store.dispatch(incrementRetryCount(action.id));
      }
    }

    if (syncedActionIds.length > 0) {
      store.dispatch(syncSuccess(syncedActionIds));
      console.log(`Successfully synced ${syncedActionIds.length} actions`);
    }

    if (failedActionIds.length > 0) {
      store.dispatch(syncFailure(`Failed to sync ${failedActionIds.length} actions`));
    }
  }

  private async syncAction(action: OfflineAction): Promise<boolean> {
    const state = store.getState();
    const {token} = state.auth;

    if (!token) {
      console.warn('No auth token available for sync');
      return false;
    }

    try {
      switch (action.type) {
        case 'delivery_complete':
          return await this.syncDeliveryComplete(action, token);
        case 'status_update':
          return await this.syncStatusUpdate(action, token);
        case 'location_update':
          return await this.syncLocationUpdate(action, token);
        case 'pickup_complete':
          return await this.syncPickupComplete(action, token);
        case 'capacity_update':
          return await this.syncCapacityUpdate(action, token);
        case 'route_update':
          return await this.syncRouteUpdate(action, token);
        case 'delivery_failure':
          return await this.syncDeliveryFailure(action, token);
        default:
          console.warn(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error syncing ${action.type}:`, error);
      return false;
    }
  }

  private async syncDeliveryComplete(action: OfflineAction, token: string): Promise<boolean> {
    const {parcelId, proofOfDelivery, completedAt} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/parcels/${parcelId}/complete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'delivered',
          proofOfDelivery,
          completedAt,
        }),
      }
    );

    return response.ok;
  }

  private async syncStatusUpdate(action: OfflineAction, token: string): Promise<boolean> {
    const {parcelId, status, timestamp, location} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/parcels/${parcelId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          timestamp,
          location,
        }),
      }
    );

    return response.ok;
  }

  private async syncLocationUpdate(action: OfflineAction, token: string): Promise<boolean> {
    const {location, timestamp} = action.payload;
    const state = store.getState();
    const {user} = state.auth;

    if (!user?.vehicleId) {
      return false;
    }

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/vehicles/${user.vehicleId}/location`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          timestamp,
        }),
      }
    );

    return response.ok;
  }

  private async syncPickupComplete(action: OfflineAction, token: string): Promise<boolean> {
    const {parcelId, timestamp, location} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/parcels/${parcelId}/pickup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'picked_up',
          timestamp,
          location,
        }),
      }
    );

    return response.ok;
  }

  private async syncCapacityUpdate(action: OfflineAction, token: string): Promise<boolean> {
    const {vehicleId, parcelId, action: capacityAction, timestamp} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/vehicles/${vehicleId}/capacity`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcelId,
          action: capacityAction,
          timestamp,
        }),
      }
    );

    return response.ok;
  }

  private async syncRouteUpdate(action: OfflineAction, token: string): Promise<boolean> {
    const {vehicleId, routePoints} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/vehicles/${vehicleId}/route`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routePoints,
        }),
      }
    );

    return response.ok;
  }

  private async syncDeliveryFailure(action: OfflineAction, token: string): Promise<boolean> {
    const {parcelId, reason, notes, attemptedAt, location} = action.payload;

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/parcels/${parcelId}/fail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'failed',
          reason,
          notes,
          attemptedAt,
          location,
        }),
      }
    );

    return response.ok;
  }

  public async forceSyncNow(): Promise<void> {
    console.log('Force sync requested');
    await this.syncPendingActions();
  }

  public getPendingActionsCount(): number {
    const state = store.getState();
    return state.offline.pendingActions.length;
  }

  public isOnline(): boolean {
    const state = store.getState();
    return state.offline.isOnline;
  }
}