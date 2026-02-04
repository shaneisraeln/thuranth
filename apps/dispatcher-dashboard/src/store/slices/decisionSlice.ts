import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Decision, ManualOverride } from '../../types';
import { decisionApi } from '../../services/api';

interface DecisionState {
  decisions: Decision[];
  recentDecisions: Decision[];
  selectedDecision?: Decision;
  isLoading: boolean;
  error?: string;
}

const initialState: DecisionState = {
  decisions: [],
  recentDecisions: [],
  isLoading: false,
};

// Async thunks
export const fetchDecisions = createAsyncThunk(
  'decisions/fetchDecisions',
  async () => {
    const response = await decisionApi.getDecisions();
    return response.data;
  }
);

export const requestDecision = createAsyncThunk(
  'decisions/requestDecision',
  async (parcelId: string) => {
    const response = await decisionApi.requestDecision(parcelId);
    return response.data;
  }
);

export const submitManualOverride = createAsyncThunk(
  'decisions/submitOverride',
  async (override: ManualOverride) => {
    const response = await decisionApi.submitManualOverride(override);
    return response.data;
  }
);

const decisionSlice = createSlice({
  name: 'decisions',
  initialState,
  reducers: {
    selectDecision: (state, action: PayloadAction<Decision>) => {
      state.selectedDecision = action.payload;
    },
    clearSelectedDecision: (state) => {
      state.selectedDecision = undefined;
    },
    addDecisionRealtime: (state, action: PayloadAction<Decision>) => {
      state.decisions.unshift(action.payload);
      state.recentDecisions.unshift(action.payload);
      
      // Keep only last 50 recent decisions
      if (state.recentDecisions.length > 50) {
        state.recentDecisions = state.recentDecisions.slice(0, 50);
      }
    },
    updateDecisionStatus: (state, action: PayloadAction<{ id: string; executed: boolean; overridden?: boolean }>) => {
      const decision = state.decisions.find(d => d.id === action.payload.id);
      if (decision) {
        decision.executed = action.payload.executed;
        if (action.payload.overridden !== undefined) {
          decision.overridden = action.payload.overridden;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDecisions.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(fetchDecisions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.decisions = action.payload;
        state.recentDecisions = action.payload.slice(0, 50);
      })
      .addCase(fetchDecisions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(requestDecision.fulfilled, (state, action) => {
        state.decisions.unshift(action.payload);
        state.recentDecisions.unshift(action.payload);
      })
      .addCase(submitManualOverride.fulfilled, (state, action) => {
        const decision = state.decisions.find(d => d.id === action.payload.id);
        if (decision) {
          decision.overridden = true;
          decision.overrideReason = action.payload.overrideReason;
        }
      });
  },
});

export const { 
  selectDecision, 
  clearSelectedDecision, 
  addDecisionRealtime, 
  updateDecisionStatus 
} = decisionSlice.actions;
export default decisionSlice.reducer;