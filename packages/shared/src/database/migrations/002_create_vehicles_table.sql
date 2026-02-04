-- Migration: Create vehicles table
-- Description: Create vehicles table for vehicle tracking and management

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    type vehicle_type NOT NULL,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Capacity information
    max_weight DECIMAL(10,2) NOT NULL CHECK (max_weight > 0),
    max_volume DECIMAL(15,2) NOT NULL CHECK (max_volume > 0),
    current_weight DECIMAL(10,2) DEFAULT 0 CHECK (current_weight >= 0),
    current_volume DECIMAL(15,2) DEFAULT 0 CHECK (current_volume >= 0),
    utilization_percentage DECIMAL(5,2) DEFAULT 0 CHECK (utilization_percentage >= 0 AND utilization_percentage <= 100),
    
    -- Location information (using PostGIS)
    current_location GEOMETRY(POINT, 4326),
    
    -- Status and metadata
    status vehicle_status DEFAULT 'AVAILABLE',
    eligibility_score DECIMAL(5,2) DEFAULT 100 CHECK (eligibility_score >= 0 AND eligibility_score <= 100),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);
CREATE INDEX idx_vehicles_utilization ON vehicles(utilization_percentage);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();