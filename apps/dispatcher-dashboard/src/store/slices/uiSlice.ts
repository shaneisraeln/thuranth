import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GeoCoordinate } from '../../types';

interface UIState {
  mapCenter: GeoCoordinate;
  mapZoom: number;
  sidebarOpen: boolean;
  activeTab: 'vehicles' | 'parcels' | 'decisions' | 'metrics';
  showOverrideModal: boolean;
  showDecisionModal: boolean;
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: Date;
  }>;
}

const initialState: UIState = {
  mapCenter: { latitude: 28.6139, longitude: 77.2090 }, // Delhi, India
  mapZoom: 10,
  sidebarOpen: true,
  activeTab: 'vehicles',
  showOverrideModal: false,
  showDecisionModal: false,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMapCenter: (state, action: PayloadAction<GeoCoordinate>) => {
      state.mapCenter = action.payload;
    },
    setMapZoom: (state, action: PayloadAction<number>) => {
      state.mapZoom = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActiveTab: (state, action: PayloadAction<'vehicles' | 'parcels' | 'decisions' | 'metrics'>) => {
      state.activeTab = action.payload;
    },
    showOverrideModal: (state) => {
      state.showOverrideModal = true;
    },
    hideOverrideModal: (state) => {
      state.showOverrideModal = false;
    },
    showDecisionModal: (state) => {
      state.showDecisionModal = true;
    },
    hideDecisionModal: (state) => {
      state.showDecisionModal = false;
    },
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      state.notifications.unshift(notification);
      
      // Keep only last 20 notifications
      if (state.notifications.length > 20) {
        state.notifications = state.notifications.slice(0, 20);
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const {
  setMapCenter,
  setMapZoom,
  toggleSidebar,
  setActiveTab,
  showOverrideModal,
  hideOverrideModal,
  showDecisionModal,
  hideDecisionModal,
  addNotification,
  removeNotification,
} = uiSlice.actions;
export default uiSlice.reducer;