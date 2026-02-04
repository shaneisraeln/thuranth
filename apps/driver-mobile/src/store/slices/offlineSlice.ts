import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface OfflineAction {
  id: string;
  type: 'delivery_complete' | 'status_update' | 'location_update' | 'pickup_complete';
  payload: any;
  timestamp: string;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime: string | null;
  error: string | null;
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  syncInProgress: false,
  lastSyncTime: null,
  error: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const newAction: OfflineAction = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.pendingActions.push(newAction);
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(
        action => action.id !== action.payload
      );
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const actionItem = state.pendingActions.find(item => item.id === action.payload);
      if (actionItem) {
        actionItem.retryCount += 1;
      }
    },
    startSync: (state) => {
      state.syncInProgress = true;
      state.error = null;
    },
    syncSuccess: (state, action: PayloadAction<string[]>) => {
      // Remove successfully synced actions
      const syncedActionIds = action.payload;
      state.pendingActions = state.pendingActions.filter(
        action => !syncedActionIds.includes(action.id)
      );
      state.syncInProgress = false;
      state.lastSyncTime = new Date().toISOString();
    },
    syncFailure: (state, action: PayloadAction<string>) => {
      state.syncInProgress = false;
      state.error = action.payload;
    },
    clearPendingActions: (state) => {
      state.pendingActions = [];
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  startSync,
  syncSuccess,
  syncFailure,
  clearPendingActions,
  setError,
} = offlineSlice.actions;

export default offlineSlice.reducer;