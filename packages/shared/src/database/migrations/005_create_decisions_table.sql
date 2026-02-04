-- Migration: Create decisions table
-- Description: Create table for decision engine results and explanations

CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    recommended_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    score DECIMAL(8,4) NOT NULL CHECK (score >= 0),
    
    -- Decision explanation stored as JSONB for flexibility
    explanation JSONB NOT NULL,
    
    -- Decision metadata
    shadow_mode BOOLEAN DEFAULT false,
    executed BOOLEAN DEFAULT false,
    overridden BOOLEAN DEFAULT false,
    override_reason TEXT,
    override_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Alternative options stored as JSONB array
    alternatives JSONB DEFAULT '[]'::jsonb,
    requires_new_dispatch BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_decisions_parcel_id ON decisions(parcel_id);
CREATE INDEX idx_decisions_recommended_vehicle ON decisions(recommended_vehicle_id);
CREATE INDEX idx_decisions_request_timestamp ON decisions(request_timestamp);
CREATE INDEX idx_decisions_shadow_mode ON decisions(shadow_mode);
CREATE INDEX idx_decisions_executed ON decisions(executed);
CREATE INDEX idx_decisions_overridden ON decisions(overridden);
CREATE INDEX idx_decisions_score ON decisions(score);

-- GIN index for JSONB columns for efficient querying
CREATE INDEX idx_decisions_explanation ON decisions USING GIN(explanation);
CREATE INDEX idx_decisions_alternatives ON decisions USING GIN(alternatives);