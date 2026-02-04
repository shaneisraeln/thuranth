-- Migration: Create routes and route_points tables
-- Description: Create tables for route management and optimization

CREATE TYPE route_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    total_distance DECIMAL(10,2) DEFAULT 0 CHECK (total_distance >= 0),
    estimated_duration INTEGER DEFAULT 0 CHECK (estimated_duration >= 0), -- minutes
    status route_status DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL CHECK (sequence_order > 0),
    location GEOMETRY(POINT, 4326) NOT NULL,
    address VARCHAR(500) NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(route_id, sequence_order)
);

-- Junction table for route points and parcels (many-to-many)
CREATE TABLE IF NOT EXISTS route_point_parcels (
    route_point_id UUID NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    PRIMARY KEY (route_point_id, parcel_id)
);

-- Create indexes
CREATE INDEX idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_route_points_route_id ON route_points(route_id);
CREATE INDEX idx_route_points_sequence ON route_points(route_id, sequence_order);
CREATE INDEX idx_route_points_location ON route_points USING GIST(location);
CREATE INDEX idx_route_points_completed ON route_points(completed);
CREATE INDEX idx_route_point_parcels_route_point ON route_point_parcels(route_point_id);
CREATE INDEX idx_route_point_parcels_parcel ON route_point_parcels(parcel_id);

-- Create triggers for updated_at
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_points_updated_at BEFORE UPDATE ON route_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();