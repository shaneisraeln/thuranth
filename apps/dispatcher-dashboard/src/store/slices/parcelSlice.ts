import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Parcel } from '../../types';
import { parcelApi } from '../../services/api';

interface ParcelState {
  parcels: Parcel[];
  pendingParcels: Parcel[];
  selectedParcel?: Parcel;
  isLoading: boolean;
  error?: string;
}

const initialState: ParcelState = {
  parcels: [],
  pendingParcels: [],
  isLoading: false,
};

// Async thunks
export const fetchParcels = createAsyncThunk(
  'parcels/fetchParcels',
  async () => {
    const response = await parcelApi.getParcels();
    return response.data;
  }
);

export const fetchPendingParcels = createAsyncThunk(
  'parcels/fetchPendingParcels',
  async () => {
    const response = await parcelApi.getPendingParcels();
    return response.data;
  }
);

export const assignParcelToVehicle = createAsyncThunk(
  'parcels/assignToVehicle',
  async ({ parcelId, vehicleId }: { parcelId: string; vehicleId: string }) => {
    const response = await parcelApi.assignParcelToVehicle(parcelId, vehicleId);
    return response.data;
  }
);

const parcelSlice = createSlice({
  name: 'parcels',
  initialState,
  reducers: {
    selectParcel: (state, action: PayloadAction<Parcel>) => {
      state.selectedParcel = action.payload;
    },
    clearSelectedParcel: (state) => {
      state.selectedParcel = undefined;
    },
    updateParcelRealtime: (state, action: PayloadAction<Parcel>) => {
      const index = state.parcels.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.parcels[index] = action.payload;
      } else {
        state.parcels.push(action.payload);
      }
      
      // Update pending parcels list
      if (action.payload.status === 'pending') {
        const pendingIndex = state.pendingParcels.findIndex(p => p.id === action.payload.id);
        if (pendingIndex !== -1) {
          state.pendingParcels[pendingIndex] = action.payload;
        } else {
          state.pendingParcels.push(action.payload);
        }
      } else {
        state.pendingParcels = state.pendingParcels.filter(p => p.id !== action.payload.id);
      }
    },
    sortPendingParcelsByPriority: (state) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      state.pendingParcels.sort((a, b) => {
        // First sort by priority
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by SLA deadline (earliest first)
        return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParcels.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(fetchParcels.fulfilled, (state, action) => {
        state.isLoading = false;
        state.parcels = action.payload;
      })
      .addCase(fetchParcels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(fetchPendingParcels.fulfilled, (state, action) => {
        state.pendingParcels = action.payload;
      })
      .addCase(assignParcelToVehicle.fulfilled, (state, action) => {
        const index = state.parcels.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.parcels[index] = action.payload;
        }
        state.pendingParcels = state.pendingParcels.filter(p => p.id !== action.payload.id);
      });
  },
});

export const { 
  selectParcel, 
  clearSelectedParcel, 
  updateParcelRealtime, 
  sortPendingParcelsByPriority 
} = parcelSlice.actions;
export default parcelSlice.reducer;