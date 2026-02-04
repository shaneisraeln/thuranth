import {createSlice, PayloadAction} from '@reduxjs/toolkit';

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
    location: {
      latitude: number;
      longitude: number;
    };
  };
}

interface DeliveryState {
  assignedParcels: Parcel[];
  completedDeliveries: Parcel[];
  currentParcel: Parcel | null;
  deliveryInProgress: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: DeliveryState = {
  assignedParcels: [],
  completedDeliveries: [],
  currentParcel: null,
  deliveryInProgress: false,
  loading: false,
  error: null,
};

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    setAssignedParcels: (state, action: PayloadAction<Parcel[]>) => {
      state.assignedParcels = action.payload;
    },
    addAssignedParcel: (state, action: PayloadAction<Parcel>) => {
      state.assignedParcels.push(action.payload);
    },
    updateParcelStatus: (state, action: PayloadAction<{parcelId: string; status: Parcel['status']}>) => {
      const {parcelId, status} = action.payload;
      const parcel = state.assignedParcels.find(p => p.id === parcelId);
      if (parcel) {
        parcel.status = status;
      }
    },
    startDelivery: (state, action: PayloadAction<Parcel>) => {
      state.currentParcel = action.payload;
      state.deliveryInProgress = true;
    },
    completeDelivery: (state, action: PayloadAction<{
      parcelId: string;
      proofOfDelivery: Parcel['proofOfDelivery'];
    }>) => {
      const {parcelId, proofOfDelivery} = action.payload;
      const parcelIndex = state.assignedParcels.findIndex(p => p.id === parcelId);
      
      if (parcelIndex !== -1) {
        const parcel = state.assignedParcels[parcelIndex];
        parcel.status = 'delivered';
        parcel.proofOfDelivery = proofOfDelivery;
        
        // Move to completed deliveries
        state.completedDeliveries.push(parcel);
        state.assignedParcels.splice(parcelIndex, 1);
      }
      
      state.currentParcel = null;
      state.deliveryInProgress = false;
    },
    failDelivery: (state, action: PayloadAction<{parcelId: string; reason: string}>) => {
      const {parcelId} = action.payload;
      const parcel = state.assignedParcels.find(p => p.id === parcelId);
      if (parcel) {
        parcel.status = 'failed';
      }
      
      state.currentParcel = null;
      state.deliveryInProgress = false;
    },
    cancelDelivery: (state) => {
      state.currentParcel = null;
      state.deliveryInProgress = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setAssignedParcels,
  addAssignedParcel,
  updateParcelStatus,
  startDelivery,
  completeDelivery,
  failDelivery,
  cancelDelivery,
  setLoading,
  setError,
} = deliverySlice.actions;

export default deliverySlice.reducer;